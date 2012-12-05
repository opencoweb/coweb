/**
 * Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
 * Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
 */
package org.coweb;

import java.util.concurrent.Semaphore;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.ArrayList;
import java.util.LinkedList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

import java.util.logging.Logger;

import org.cometd.bayeux.server.BayeuxServer;
import org.cometd.bayeux.Message;
import org.cometd.bayeux.server.ServerSession;
import org.cometd.bayeux.server.LocalSession;
import org.cometd.bayeux.server.ServerChannel;
import org.cometd.bayeux.server.ServerMessage;
import org.cometd.bayeux.server.ConfigurableServerChannel;

import org.coweb.oe.OperationEngineException;

import java.io.IOException;
import java.security.MessageDigest;

/**
 * SessionHandler receives and handles all coweb protocol messages belonging to
 * this session. Maintains a ServiceHandler for all incoming bot messages.
 * Maintains a Moderator.
 */
public class SessionHandler implements ServerChannel.MessageListener {

	private static final String sendOnceKey =
		"698e141094de24baec7998994d6d32f4";

	private static final Logger log = Logger.getLogger(SessionHandler.class
			.getName());

	private String confKey = null;
	private boolean cacheState = false;
	private String sessionId = null;
	private ServiceHandler serviceHandler = null;
	private BayeuxServer server = null;
	private LateJoinHandler lateJoinHandler = null;
	private SessionModerator sessionModerator = null;
	private OperationEngineHandler operationEngine = null;
	private SessionManager manager;
	private LinkedList modSyncQueue = new LinkedList();

	private Semaphore modSyncSem = new Semaphore(1);
	private AtomicInteger order = new AtomicInteger(0);

	private String syncAppChannel = null;
	private String syncEngineChannel = null;
	private String rosterAvailableChannel = null;
	private String rosterUnavailableChannel = null;
	private String botRequestChannel = null;

	private String requestUrl = null;
	private String sessionName = null;

	private ArrayList<ServerSession> attendees = new ArrayList<ServerSession>();

	/**
	 * Create a SessionHandler. There is one session handler keyed on cowebkey
	 * and the cacheState boolean. This constructor sets up channel listeners,
	 * creates the service handler, an operation engine, and a moderator
	 * depending on the configuration settings.
	 * @param confkey cowebkey that uniquely identifies a coweb application
	 *                session.
	 * @param cacheState Whether or not this session caches application state.
	 * @param config Configuration options for this application. See <a href="http://opencoweb.org/ocwdocs/java/deploy.html#web-inf-web-xml">configuration documentation.</a>.
	 */
	public SessionHandler(String confkey, boolean cacheState,
			Map<String, Object> config) {

		this.confKey = confkey;
		this.cacheState = cacheState;
		this.sessionId = hashURI(confkey);
		this.serviceHandler = new ServiceHandler(this.sessionId, config);
		this.manager = SessionManager.getInstance();

		this.server = this.manager.getBayeux();

		this.syncAppChannel = "/session/" + this.sessionId + "/sync/app";
		this.syncEngineChannel = "/session/" + this.sessionId + "/sync/engine";
		this.rosterAvailableChannel = "/session/" + this.sessionId
				+ "/roster/available";
		this.rosterUnavailableChannel = "/session/" + this.sessionId
				+ "/roster/unavailable";
		this.botRequestChannel = "/service/bot/%s/request";

		/* The following creates and listens to the app sync and engine
		 * sync channels. */
		ServerChannel.Initializer initializer = new ServerChannel.Initializer()
		{
			@Override
			public void configureChannel(ConfigurableServerChannel channel) {
				channel.setPersistent(true);
				channel.setLazy(false);
			}
		};
		this.server.createIfAbsent(this.syncAppChannel, initializer);
		this.server.createIfAbsent(this.syncEngineChannel, initializer);

		ServerChannel sync = server.getChannel(this.syncAppChannel);
		sync.addListener(this);
		sync = server.getChannel(this.syncEngineChannel);
		sync.addListener(this);

		this.sessionModerator = SessionModerator.getInstance(this,
				(String)config.get("sessionModerator"), confKey);
		if (null == this.sessionModerator) {
			config.put("moderatorIsUpdater", false);
			/* Perhaps config.get("sessionModerator") had an exception or
			 * didn't exist, so either we try to create default implementation
			 * of moderator, or throw an exception. */
			log.severe("SessionModerator.getInstance(" +
					config.get("sessionModerator") + ") failed, reverting to " +
					"trying to create default implementation.");
			this.sessionModerator = SessionModerator.getInstance(this,
					null, confKey);
			if (null == this.sessionModerator) {
				throw new CowebException("Create SessionModerator", "");
			}
			log.severe("SessionModerator created default implementation, but " +
					"moderator can no longer be updater.");
		}

		// create the late join handler. clients will be updaters by default.
		boolean mustUseEngine = false;
		LateJoinHandler lh = null;
		if (config.containsKey("moderatorIsUpdater") &&
				((Boolean) config.get("moderatorIsUpdater")).booleanValue()) {
			// If moderator is updater, the OperationEngine *must* be used!
			mustUseEngine = true;
			lh = new ModeratorLateJoinHandler(this, config);
		} else {
			log.info("creating LateJoinHandler");
			lh = new LateJoinHandler(this, config);
		}
		this.lateJoinHandler = lh;

		/* create the OT engine only if turned on in the config, or
		 * moderatorIsUpdater. */
		boolean useEngine = config.containsKey("operationEngine") && 
			((Boolean) config.get("operationEngine")).booleanValue();
		if (!useEngine && mustUseEngine) {
			log.warning("Must use OperationEngine because moderatorIsUpdater" +
					"==true, even though operationEngine is not set.");
			useEngine = true;
		}
		if (useEngine) {
			LocalSession modSession = this.sessionModerator.getLocalSession();
			Integer siteId = (Integer) modSession.getAttribute("siteid");

			try {
				log.info("creating operation engine with siteId = " + siteId);
				this.operationEngine = new OperationEngineHandler(this,
						siteId.intValue());
			} catch (OperationEngineException e) {
				e.printStackTrace();
			}
		}
		else {
			log.info("No op engine for this session");
		}
	}

	public SessionModerator getSessionModerator() {
		return this.sessionModerator;
	}

	public String getRequestUrl() {
		return this.requestUrl;
	}

	public void setRequestUrl(String url) {
		this.requestUrl = url;
	}

	public String getSessionName() {
		return this.sessionName;
	}

	public void setSessionName(String name) {
		this.sessionName = name;
	}

	public ServiceHandler getServiceHandler() {
		return this.serviceHandler;
	}

	public ArrayList<ServerSession> getAttendees() {
		return this.attendees;
	}

	public String getRosterAvailableChannel() {
		return this.rosterAvailableChannel;
	}

	public String getRosterUnavailableChannel() {
		return this.rosterUnavailableChannel;
	}

	public String getConfKey() {
		return this.confKey;
	}

	public String getSessionId() {
		return this.sessionId;
	}

	public boolean isCachingState() {
		return this.cacheState;
	}

	public String toString() {
		StringBuffer sb = new StringBuffer();
		sb.append("{\"confkey\":");
		sb.append(this.confKey);
		sb.append(",\"sessionid\":");
		sb.append(this.sessionId);
		sb.append("}");

		return sb.toString();
	}

	public ServerSession getServerSessionFromSiteid(String siteStr) {
		return this.lateJoinHandler.getServerSessionFromSiteid(siteStr);
	}

	/**
	  * Called whenever a client sends an application message to the server.
	  * This does not include /meta, /service, and /bot messages, which are
	  * handled by different methods. This method handles application sync and
	  * engine sync messages.
	  *
	  * The cometd implementation is free to have multiple threads invoke
	  * onMessage for different incoming messages, so be aware of mutual
	  * exclusion issues.
	  */
	public boolean onMessage(ServerSession from, ServerChannel channel,
			ServerMessage.Mutable message) {

		Integer siteId = (Integer) from.getAttribute("siteid");

		String msgSessionId = (String) from.getAttribute("sessionid");
		if (!msgSessionId.equals(this.sessionId)) {
			log.severe("Received message not belonging to this session " +
					msgSessionId);
			return true; /* TODO why are we sending this message to clients, if
							the message doesn't belong to us? */
		}

		Map<String, Object> data = message.getDataAsMap();
		if (data.get("__alreadySent") == SessionHandler.sendOnceKey) {
			/* The message came from onMessage manually publishing a sync. We
			 * simply forward it to clients. */
			data.remove("__alreadySent");
			return true;
		}
		
		this.lateJoinHandler.clearCacheState();

		data.put("siteId", siteId);

		/* Some of the following code must acquire this.operationEngine's lock.
		 * OperationEngine must only be accessed by one client at a time. */
		String channelName = message.getChannel();
		if (channelName.equals(this.syncAppChannel)) {
			// put total order on message
			data.put("order", this.order.getAndIncrement());

			if (this.operationEngine != null) {
				synchronized (this.operationEngine) {
					return this.doAppSync(from, channel, message, data);
				}
			}
		} else if (channelName.equals(this.syncEngineChannel)) {
			if (operationEngine != null) {
				synchronized (this.operationEngine) {
					this.operationEngine.engineSyncInbound(data);
				}
			}
		} else {
			log.warning("onMessage does not handle channel messages '" +
					channelName + "'\n    message = " + message);
		}

		return true;
	}


	private boolean doAppSync(ServerSession from, ServerChannel channel,
			ServerMessage.Mutable message, Map<String, Object> data) {
		Map<String, Object> syncEvent = this.operationEngine.syncInbound(data);
		if (syncEvent != null) {
			try {
				this.modSyncSem.acquire();
			} catch (InterruptedException ie) {
				log.warning("onMessage interrupted, won't deliver sync to" +
						" moderator or other listeners");
				return false;
			}
			this.sessionModerator.onSync(from, syncEvent);
			data.put("__alreadySent", SessionHandler.sendOnceKey);
			/* In order to satisfy ordering requirements, we must send the
			 * remote client's sync to other clients, then send any syncs
			 * generated by the moderator. Thus, we manually publish the sync
			 * instead of returning true from onMesage(). This is the only way
			 * we can possibly publish the remote client sync *first*. */
			channel.publish(from, message);
			/* Now, send any moderator syncs. */
			this.flushModeratorQueue();
			this.modSyncSem.release();
			return false;
		}
		return true;
	}

	/**
	 * Handles bayeux messaegs on the channels below.
	 *   <li> /session/roster/*
	 *   <li> /service/session/join/*
	 *   <li> /service/session/updater
	 *   <li> /service/bot/**
	 *   <li> /bot/**
	 *
	 * Specifically, onPublish handles clients sending private bot messages
	 * and when updaters send full application state to the server.
	 */
	public void onPublish(ServerSession remote, Message message) {
		String channel = message.getChannel();
		try {
			if (channel.startsWith("/service/bot")) {
				/* Moderator can always make service requests. */
				String svcName = ServiceHandler.getServiceNameFromMessage(
						message, false);
				if (this.sessionModerator.getServerSession() == remote ||
						this.sessionModerator.canClientMakeServiceRequest(
							svcName, remote, message)) {
					this.serviceHandler.forwardUserRequest(remote, message);
				} else {
					this.serviceHandler.userCannotPost(remote, message);
				}
			} else if (channel.equals("/service/session/updater")) {
				this.lateJoinHandler.onUpdaterSendState(remote, message);
			} else {
				log.warning("onPublish doesn't handle '" + channel +
						"' messages\n  message = " + message);
			}
		} catch (Exception e) {
			log.severe("error receiving publish message");
			log.severe(message.getJSON());
			e.printStackTrace();
		}
	}

	/**
	 * Called anytime a client posts to /meta/subscribe. SessionHandler needs
	 * to know when (1) a client attempts to join a session, (2) a client wants
	 * to subscribe to a bot, and (3) when a client wishes to become an updater.
	 * Other subscriptions are ignored (i.e. we don't wish to know about them).
	 * @param serverSession Client wishing to subscribe to some channel.
	 * @param message Contains channel the client wishes to subscribe to.
	 */
	public void onSubscribe(ServerSession serverSession, Message message)
			throws IOException {
		String channel = (String) message.get(Message.SUBSCRIPTION_FIELD);
		if (channel.equals("/service/session/join/*")) {
			if (this.sessionModerator.canClientJoinSession(serverSession,
						message)) {
				if (this.lateJoinHandler.onClientJoin(serverSession, message)) {
					this.sessionModerator.onSessionReady();
				}
			} else {
				this.sendError(serverSession, "join-disallowed");
			}
		} else if (channel.startsWith("/service/bot") ||
				channel.startsWith("/bot")) {
			/* Client wishes to subscribe to service messages (broadcasts and
			 * private bot messages). Moderator can always make service
			 * requests. */
			boolean pub = true;
			if (channel.startsWith("/service"))
					pub = false;
			String svcName = ServiceHandler.getServiceNameFromMessage(message,
					pub);

			if (this.sessionModerator.getServerSession() == serverSession ||
					this.sessionModerator.canClientSubscribeService(
						svcName, serverSession, message)) {
				this.serviceHandler.subscribeUser(serverSession, message);
			} else {
				this.serviceHandler.userCannotSubscribe(serverSession, message);
			}

		} else if (channel.endsWith("/session/updater")) {
			/* Client lets the server know it is an updater. */
			log.info("client subscribes to /session/updater");
			this.attendees.add(serverSession);
			this.lateJoinHandler.onUpdaterSubscribe(serverSession, message);
			this.sessionModerator.onClientJoinSession(serverSession, message);
		}
	}

	/**
	 * Subscribes the moderator to service message broadcasts.
	 * @param svcName The service name.
	 */
	void subscribeModeratorToService(String svcName) {
		try {
			this.serviceHandler.subscribeModerator(this.sessionModerator,
					svcName);
		} catch (Exception e) {
			log.severe("error subscribing moderator to service " + svcName);
			e.printStackTrace();
		}
	}

	private void sendError(ServerSession client, String topic) {
		Map<String, Object> map = new HashMap<String, Object>();
		map.put("topic", topic);
		client.deliver(this.manager.getServerSession(), "/session/error",
				map, null);
	}

	/**
	 * Called when a client unsubscribes to a channel (via posting to
	 * /meta/unsubscribe). We need to know when a client wishes to stop
	 * listening to bot messages.
	 */
	public void onUnsubscribe(ServerSession serverSession, Message message)
			throws IOException {
		String channel = (String) message.get(Message.SUBSCRIPTION_FIELD);
		if (channel.startsWith("/service/bot") || channel.startsWith("/bot")) {
			/* Client wishes to unsubscribe to service requests. */
			this.serviceHandler.unSubscribeUser(serverSession, message);
		}
		return;
	}

	public void onPurgingClient(ServerSession client) {
		this.attendees.remove(client);
		this.sessionModerator.onClientLeaveSession(client);
		boolean last = this.lateJoinHandler.onClientRemove(client);
		if (last) {
			this.endSession();
		}
	}

	public static String hashURI(String url) {
		String hash = null;
		try {
			String t = Long.toString(System.currentTimeMillis());
			url = url + t;
			byte[] bytes = url.getBytes("UTF-8");
			MessageDigest md = MessageDigest.getInstance("MD5");
			byte[] digest = md.digest(bytes);

			StringBuffer sb = new StringBuffer();
			for (int i = 0; i < digest.length; i++) {
				sb.append(Integer.toString((digest[i] & 0xff) + 0x100, 16)
						.substring(1));
			}

			hash = sb.toString();

		} catch (Exception e) {
			hash = url;
		}

		return hash;
	}

	/**
	 * Remove a buggy or malicious client from a session.
	 * @param client The client to be removed.
	 */
	public void removeBadClient(ServerSession client) {
		/* TODO this is clearly a NOP... */
		return;
	}

	/**
	 * Called when all remote clients leave a OCW session. This method notifies
	 * the moderator, the late join handler, the service handler of the session
	 * ending. The server removes itself as a listener to sync channels.
	 */
	public void endSession() {
		log.info("SessionHandler::endSession ***********");

		ServerChannel sync = this.server.getChannel(this.syncAppChannel);
		sync.removeListener(this);

		sync = server.getChannel(this.syncEngineChannel);
		sync.removeListener(this);

		// The following ordering must be observed!
		this.sessionModerator.endSession();
		if (null != this.operationEngine)
			this.operationEngine.shutdown();
		this.lateJoinHandler.onEndSession();
		this.serviceHandler.shutdown();

		// just to make sure we are not pinning anything down.
		this.sessionModerator = null;
		this.operationEngine = null;
		this.lateJoinHandler = null;
		this.serviceHandler = null;

		this.manager.removeSessionHandler(this);
	}
	
	/**
	 * Publishes a local op engine sync event to the /session/ID/sync/engine
	 * bayeux channel.
	 * @param sites context int array context vector for this site
	 */
	public void postEngineSync(Integer[] sites) {
		ServerChannel sync = this.server.getChannel(this.syncEngineChannel);
		
		HashMap<String, Object> data = new HashMap<String, Object>();
		data.put("context", sites);
		
		// We publish *from* the LocalSession.
		sync.publish(this.sessionModerator.getLocalSession(), data, null);
	}

	/**
	  * Retreives the four element Object engine state array and returns it.
	  * @return engine state array
	  */
	public Object[] getEngineState() {
		Object[] ret;
		synchronized (this.operationEngine) {
			ret = this.operationEngine.getEngineState();
		}
		return ret;
	}

	/**
	 * Publish a mesage from the moderator to all listening clients. This method
	 * doesn't actually send anything directly, but rather it delegates work
	 * to OperationEngineHandler which sends the event and pushes the op to the
	 * local operation engine.
	 * @param name Collab topic (includes ^coweb.sync. and collabId$).
	 * @param value Application value.
	 * @param type One of {"insert", "delete", "update", null}.
	 * @param position Position where sync event is to be applied.
	 */
	public void publishModeratorSync(String name, Object value, String type,
			int position) {
		this.operationEngine.localSync(name, value, type, position);
	}

	/**
	 * Sends message on the /session/ID/sync/app channel. This is called from
	 * OperationEngineHandler to actually put the message on the wire.
	 */
	public void sendModeratorSync(Object message) {
		/* We act as if the moderator is just another client participating in
		 * the session. This method is called from the OperationEngineHandler,
		 * which means the op engine pushed the operation through as a local op.
		 *
		 * When this message is sent to the "server," the op engine pushes
		 * through the exact same operation as a remote op. This mimics the
		 * behavior of browser clients pushing local ops through their engines,
		 * then pushing the same exact op through as a remote op when the server
		 * forwards the op back to the same browser client. The op engine knows
		 * to disregard the op, since it has already been pushed through once as
		 * a local op.
		 *
		 * SessionModerator.onSync() may call this method (indirectly), in which
		 * case the modSyncSem semaphore will already be exhausted of permits.
		 * Thus, we try to acquire the semaphore, and if we fail, we wait until
		 * onSync() returns to flush the queue. */
		synchronized(this.modSyncQueue) {
			this.modSyncQueue.push(message);
		}
		/* TODO Memory fence? */
		if (this.modSyncSem.tryAcquire()) {
			this.flushModeratorQueue();
			this.modSyncSem.release();
		}
	}

	/* Protected by modSyncSem. */
	private void flushModeratorQueue() {
		ServerChannel channel = this.server.getChannel(this.syncAppChannel);
		synchronized(this.modSyncQueue) {
			for (Object message: this.modSyncQueue)
				channel.publish(this.sessionModerator.getLocalSession(),
						message, null);
			this.modSyncQueue.clear();
		}
	}

	/**
	 * Find the service request channel.
	 * @param svc The channel name.
	 * @return The server request channel.
	 */
	private ServerChannel getServiceRequestChannel(String svc) {
		String ch = String.format(this.botRequestChannel, svc);
		this.server.createIfAbsent(ch);
		return this.server.getChannel(ch);
	}

	/**
	 * Post a bot service message. This actually sends the message on the wire.
	 * @param service Bot service name.
	 * @param topic Bots expect a unique token to know which request to reply to
	 * @param params JSON encodable message.
	 */
	public void postModeratorService(String service, String topic,
			Map<String, Object> params) {
		ServerChannel channel = this.getServiceRequestChannel(service);
		Map<String, Object> message = new HashMap<String, Object>();
		message.put("value", params);
		message.put("topic", topic);
		message.put("service", service);
		channel.publish(this.sessionModerator.getLocalSession(), message, null);
	}

}

