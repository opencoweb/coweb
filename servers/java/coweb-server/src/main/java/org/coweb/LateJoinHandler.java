package org.coweb;

import java.math.BigInteger;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.logging.Logger;

import org.cometd.bayeux.Message;
import org.cometd.bayeux.server.BayeuxServer;
import org.cometd.bayeux.server.ConfigurableServerChannel;
import org.cometd.bayeux.server.ServerChannel;
import org.cometd.bayeux.server.ServerMessage;
import org.cometd.bayeux.server.ServerSession;
import org.cometd.bayeux.server.LocalSession;
import org.eclipse.jetty.util.ajax.JSON;

//import org.coweb.LateJoinHandler.BatchUpdateMessage;

public class LateJoinHandler {

	protected SessionHandler sessionHandler = null;
	protected ServiceHandler serviceHandler = null;
	protected SessionManager sessionManager = null;
	protected SessionModerator sessionModerator = null;
	protected UpdaterTypeMatcher updaterTypeMatcher = null;
	protected boolean cacheState = true;

	private static final Logger log = Logger.getLogger(LateJoinHandler.class
			.getName());

	private Map<String, ServerSession> updatees = new HashMap<String, ServerSession>();

	protected Map<String, List<String>> updaters = new HashMap<String, List<String>>();

	/**
	 * List of available siteids. An index with a null value is an available
	 * siteid, otherwise the slot is filled with ServerSession's clientid (i.e.
	 * {@link org.cometd.bayeux.Session#getId}).
	 */
	protected ArrayList<String> siteids = new ArrayList<String>(5);

	private Object[] lastState = null;

	/**
	 * Map of bayeux client id to ServerSession. "clientId" is defined as the return value
	 * of {@link org.cometd.bayeux.Session#getId}. For LocalSession/ServerSession pairs, the
	 * values are identical (e.g. for the SessionModerator Session pair).
	 */
	private Map<String, ServerSession> clientids = new HashMap<String, ServerSession>();

	public LateJoinHandler(SessionHandler sessionHandler,
			Map<String, Object> config) {

		this.siteids.add(0, "reserved");
		for (int i = 1; i < 5; i++) {
			this.siteids.add(i, null);
		}

		this.sessionHandler = sessionHandler;
		this.serviceHandler = this.sessionHandler.getServiceHandler();
		this.sessionManager = SessionManager.getInstance();

		if (config.containsKey("cacheState")) {
			this.cacheState = ((Boolean)config.get("cacheState")).booleanValue();
		}

		String classStr = "org.coweb.DefaultUpdaterTypeMatcher";
		if (config.containsKey("updaterTypeMatcher")) {
			classStr = (String) config.get("updaterTypeMatcher");
		}

		try {
			Class<? extends UpdaterTypeMatcher> c = Class.forName(classStr)
					.asSubclass(UpdaterTypeMatcher.class);
			this.updaterTypeMatcher = c.newInstance();
		} catch (Exception e) {
			e.printStackTrace();
		}
		
		this.sessionModerator = sessionHandler.getSessionModerator();
		ServerSession moderator = this.sessionModerator.getServerSession();

		// make sure the moderator has joined the conference and has a site
		// id before anyone joins.  User slot 0 for moderator.
		this.siteids.set(0, moderator.getId());
		this.sessionModerator.setSessionAttribute("siteid", new Integer(0));
		this.clientids.put(moderator.getId(), moderator);
	}

	public ServerSession getServerSessionFromSiteid(String siteStr) {
		try {
			int siteid = Integer.valueOf(siteStr);
			String clientId = this.siteids.get(siteid);

			if (clientId == null)
				return null;

			return this.clientids.get(clientId);
		} catch (Exception e) {
			;
		}

		return null;
	}
	
	public void clearCacheState() {
		this.lastState = null;
	}

	/**
	 * Called when a client first attempts to join a session. This is called after
	 * a client has subscribed to /service/session/join/[siteid,roster,state].
	 * This method then sends siteid and roster info back to the client.
	 * If there is state to send (either no updaters, so empty state, or cached
	 * state), this method sends it immediately. Otherwise, this method asks an
	 * updater for state.
	 *
	 * @param client Remote client joining the session.
	 * @param message
	 * @return Whether or or not this was the first client to join.
	 */
	public boolean onClientJoin(ServerSession client, Message message) {
		boolean first = false;
		int siteId = this.getSiteForClient(client);
		log.info("client site id = " + siteId);

		if (siteId == -1) {
			siteId = this.addSiteForClient(client);
			log.info("new site id = " + siteId);
		}

		Map<Integer, String> roster = this.getRosterList(client);
		Object[] data = new Object[0];

		boolean sendState = false;

		Map<String, Object> ext = message.getExt();
		@SuppressWarnings("unchecked")
		Map<String, Object> cobwebData = (Map<String, Object>) ext.get("coweb");
		String updaterType = (String) cobwebData.get("updaterType");
		client.setAttribute("updaterType", updaterType);
		log.info("updaterType = " + updaterType);

		if (this.updaters.isEmpty()) {
			/* This is the first client, since there are no other updaters. Send empty
			 * state and make this client an updater for future late joiners. */
			this.addUpdater(client, false);
			sendState = true;
			first = true;
		} else if (this.lastState == null) {
			/* Assign another client to be the "updater" of the newly joined client. */
			this.assignUpdater(client, updaterType);
			sendState = false;
		} else {
			/* Send the cached state, but don't make this client an updater. */
			data = this.lastState;
			sendState = true;
		}

		client.batch(new BatchUpdateMessage(client, siteId, roster, data,
					sendState));
		return first;
	}

	/**
	 * Called when some updater client sends its full state to the server.
	 * This method checks the updater token to determine which newly joined
	 * client should receive the full application state.
	 * @param client The updater client.
	 * @param message Contains token to identify the late joiner to get the state.
	 */
	public void onUpdaterSendState(ServerSession client, Message message) {
		//log.info(message.getJSON());
		String clientId = client.getId();
		Map<String, Object> data = message.getDataAsMap();

		String token = (String) data.get("token");
		if (token == null) {
			/* Malicious or buggy client. */
			this.sessionHandler.removeBadClient(client);
			return;
		}

		List<String> tokens = this.updaters.get(clientId);
		if (tokens == null) {
			/* Client isn't really an updater: possible malicious or buggy client. */
			this.sessionHandler.removeBadClient(client);
			return;
		}

		if (!tokens.remove(token)) {
			/* Token not found: again, client is possibly malicious or buggy. */
			this.sessionHandler.removeBadClient(client);
			return;
		}

		/* Now, we have a validated token. Find the updatee. */
		ServerSession updatee = this.updatees.get(token);
		if (updatee == null)
			return;

		this.updatees.remove(token);
		/* Should we cache the state? */
		if (this.cacheState) {
			this.lastState = (Object[]) data.get("state");
			log.fine("Cached state from updater.");
			log.fine(JSON.toString(this.lastState));
		}

		ServerMessage.Mutable msg = this.sessionManager.getBayeux()
				.newMessage();

		msg.setChannel("/service/session/join/state");
		if (this.cacheState) {
			log.info("sending cached state");
			msg.setData(this.lastState);
		} else {
			log.info("sending state from updater");
			msg.setData((Object[]) data.get("state"));
		}
		msg.setLazy(false);

		updatee.deliver(this.sessionManager.getServerSession(), msg);
	}

	/**
	 * Called when a client becomes an updater.
	 * @param client The new updater.
	 * @param message
	 */
	public void onUpdaterSubscribe(ServerSession client, Message message) {
		this.addUpdater(client, true);
	}

	/**
	 * Called when a client leaves a session.
	 * @param client The client who is leaving.
	 * @return True if and only if this was the last updater.
	 */
	public boolean onClientRemove(ServerSession client) {

		log.info("siteId = " + client.getAttribute("siteid"));

		this.removeUpdater(client);
		if (this.getUpdaterCount() == 0) {
			log.info("removing last updater, ending coweb session");
			return true;
		}

		return false;
	}

	/**
	 * Called when all clients leave a session.
	 */
	public boolean onEndSession() {
		this.updatees.clear();
		this.updaters.clear();
		this.siteids.clear();
		this.lastState = null;
		this.clientids.clear();

		return true;
	}

	protected void addUpdater(ServerSession serverSession, boolean notify) {
		String clientId = serverSession.getId();

		/* TODO ??? The comment below and the if statement contradict each other.
		 * Moreover, the !this.updaters.isEmpty() is redundant... */
		// check if this client is already an updater and ignore unless this is
		// the first updater
		if (this.updaters.containsKey(clientId) && !this.updaters.isEmpty()) {
			return;
		}

		// serverSession.setAttribute("username", clientId);
		log.fine("adding " + clientId + " to list of updaters");
		this.updaters.put(clientId, new ArrayList<String>());

		if (notify) {
			this.sendRosterAvailable(serverSession);
		}
	}

	private void sendRosterAvailable(ServerSession client) {
		log.info("sending roster available");
		ServerSession from = this.sessionManager.getServerSession();

		Integer siteId = (Integer) client.getAttribute("siteid");
		String username = (String) client.getAttribute("username");

		Map<String, Object> data = new HashMap<String, Object>();
		data.put("siteId", siteId);
		data.put("username", username);

		String rosterAvailableChannel = this.sessionHandler.getRosterAvailableChannel();
		for (ServerSession c : this.sessionHandler.getAttendees()) {
			c.deliver(from, rosterAvailableChannel, data, null);
		}

	}

	protected void sendRosterUnavailable(ServerSession client) {
		log.fine("CollabSessionHandler::sendRosterAvailable");
		/* create channel */
		BayeuxServer server = this.sessionManager.getBayeux();
		ServerChannel.Initializer initializer = new ServerChannel.Initializer() {
			@Override
			public void configureChannel(ConfigurableServerChannel channel) {
				channel.setPersistent(true);
			}
		};

		String rosterUnavailableChannel = this.sessionHandler.getRosterUnavailableChannel();
		server.createIfAbsent(rosterUnavailableChannel, initializer);
		ServerChannel channel = server.getChannel(rosterUnavailableChannel);
		if (channel == null) {
			return;
		}

		ServerSession from = this.sessionManager.getServerSession();

		Integer siteId = (Integer) client.getAttribute("siteid");
		String username = (String) client.getAttribute("username");

		Map<String, Object> data = new HashMap<String, Object>();
		data.put("siteId", siteId);
		data.put("username", username);

		log.fine(data.toString());

		channel.publish(from, data, null);
	}

	public String toString() {
		return "LateJoinHandler";
	}

	protected int getSiteForClient(ServerSession client) {
		if (this.siteids.contains(client.getId())) {
			return this.siteids.indexOf(client.getId());
		}

		return -1;
	}

	protected int addSiteForClient(ServerSession client) {

		int index = this.siteids.indexOf(null);
		if (index == -1) {
			index = this.siteids.size();
			this.siteids.ensureCapacity(this.siteids.size() + 1);
			this.siteids.add(index, client.getId());
		} else
			this.siteids.set(index, client.getId());

		client.setAttribute("siteid", new Integer(index));
		this.clientids.put(client.getId(), client);

		return index;
	}

	protected int removeSiteForClient(ServerSession client) {

		if (client == null) {
			log.severe("removeSiteForClient ******* client is null *******");
			return -1;
		}

		int siteid = this.siteids.indexOf(client.getId());
		if (siteid == -1) {
			log.severe("removeSiteForClient ****** Cannot find client in siteids list *******");
			Integer i = (Integer) client.getAttribute("siteid");
			if (i == null) {
				log.severe("******* Client Does not have siteId attribute - Ghost *******");
			}
			return -1;
		}

		this.siteids.set(siteid, null);
		return siteid;
	}

	protected Map<Integer, String> getRosterList(ServerSession client) {

		Map<Integer, String> roster = new HashMap<Integer, String>();

		for (String clientId : this.updaters.keySet()) {
			ServerSession c = this.clientids.get(clientId);
			Integer siteId = (Integer) c.getAttribute("siteid");
			roster.put(siteId, (String) c.getAttribute("username"));
		}

		return roster;
	}

	/**
	 * Assign an updater to provide full application state to a newly joined
	 * client. 
	 * @param updatee The newly joined client.
	 * @param updaterType Updater type as specified by the OCW application.
	 */
	private void assignUpdater(ServerSession updatee, String updaterType) {
		log.info("assignUpdater *****************");
		ServerSession from = this.sessionManager.getServerSession();
		if (this.updaters.isEmpty()) {
			this.addUpdater(updatee, false);
			((ServerSession)updatee).deliver(from, "/service/session/join/state",
					new ArrayList<String>(), null);
			return;
		}

		String updaterId = null;
		ServerSession updater = null;
		if (!updaterType.equals("default")) {
			/* Try to find a custom updater. */
			String matchedType = updaterTypeMatcher.match(updaterType,
					getAvailableUpdaterTypes());
			if (matchedType != null) {
				for (String id : this.updaters.keySet()) {
					updater = this.clientids.get(id);
					if (updater.getAttribute("updaterType").equals(matchedType)) {
						updaterId = id;
						log.fine("found an updater type matched to [" + matchedType + "]");
						break;
					}
				}
			}
		}
		if (updaterId == null) {
			/* Choose random updater for default types or if a custom updater wasn't
			 * found. */
			Random r = new Random();
			int idx = r.nextInt(this.updaters.size());

			log.fine("using default updater type");
			Object[] keys = this.updaters.keySet().toArray();
			updaterId = (String) keys[idx];
			updater = this.clientids.get(updaterId);
		}

		/* Now we've found an updater, so generate a token and ask the updater to
		 * provide full application state. */
		log.fine("assigning updater " + updater.getAttribute("siteid") + " to "
				+ updatee.getAttribute("siteid"));
		SecureRandom s = new SecureRandom();
		String token = new BigInteger(130, s).toString(32);

		this.updaters.get(updaterId).add(token);
		this.updatees.put(token, updatee);

		updater.deliver(from, "/service/session/updater", token, null);
	}

	protected void removeUpdater(ServerSession client) {
		log.fine("CollabDelegate::removeUpdater " + client);
		this.removeSiteForClient(client);

		List<String> tokenList = this.updaters.get(client.getId());
		this.updaters.remove(client.getId());
		if (tokenList == null) {
			for (String token : this.updatees.keySet()) {
				ServerSession updatee = this.updatees.get(token);
				if (updatee.getId().equals(client.getId())) {
					this.updatees.remove(token);
				}
			}
		} else {
			log.fine("sending roster unavailable");
			this.sendRosterUnavailable(client);
			if (!tokenList.isEmpty()) {
				log.fine("this updater was updating someone");
				for (String token : tokenList) {
					ServerSession updatee = this.updatees.get(token);
					if (updatee == null)
						continue;

					// this.updatees.remove(token);
					String updaterType = (String) client
							.getAttribute("updaterType");
					if (updaterType == null) {
						updaterType = "default";
					}
					this.assignUpdater(updatee, updaterType);
				}
			}
		}
	}

	private int getUpdaterCount() {
		return this.updaters.size();
	}

	private List<String> getAvailableUpdaterTypes() {
		List<String> availableUpdaterTypes = new ArrayList<String>();
		for (String id : this.updaters.keySet()) {
			ServerSession updater = this.clientids.get(id);
			availableUpdaterTypes.add((String) updater
					.getAttribute("updaterType"));
		}
		return availableUpdaterTypes;
	}

	class BatchUpdateMessage implements Runnable {

		private ServerSession client = null;
		private Object data = null;
		private Map<Integer, String> roster = null;
		private int siteId = -1;
		private boolean sendState = false;

		/**
		  *
		  * Sends all the important information to a client upon joining.
		  * The data parameter should be an Object[] with three elements:
		  *   <ul>
		  *     <li> [{topic: coweb.state.set.collab_name, value: application state}, ...] (this will be an array)
		  *     <li> {topic: coweb.engine.state, value: TODO}
		  *     <li> {topic: coweb.pause.state, value: TODO}
		  *   </ul>
		  *
		  * @param siteId site id
		  * @param roster current session roster
		  * @param data session state
		  * @param sendState whether or not to send session state
		  */
		BatchUpdateMessage(ServerSession client, int siteId, Map<Integer, String> roster, 
				Object data, boolean sendState) {
			this.client = client;
			this.siteId = siteId;
			this.roster = roster;
			this.data = data;
			this.sendState = sendState;
		}

		@Override
		public void run() {
			SessionManager manager = SessionManager.getInstance();
			ServerSession server = manager.getServerSession();

			this.client.deliver(server, "/service/session/join/siteid",
					this.siteId, null);
			this.client.deliver(server, "/service/session/join/roster",
					this.roster, null);

			if (this.sendState) {
				this.client.deliver(server, "/service/session/join/state",
						this.data, null);
			}
		}
	}

}
