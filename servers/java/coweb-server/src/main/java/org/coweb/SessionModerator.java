
package org.coweb;

import java.util.Map;
import java.util.HashMap;
import java.util.Set;
import java.util.HashSet;

import org.cometd.bayeux.Message;
import org.cometd.bayeux.server.ServerMessage;
import org.cometd.bayeux.server.BayeuxServer;
import org.cometd.bayeux.server.LocalSession;
import org.cometd.bayeux.server.ServerSession;

/**
 * 
 * In order to use a custom SessionModerator for an OCW application, you must
 * <a href="http://opencoweb.org/ocwdocs/java/deploy.html#configuring-coweb-options"> use a custom coweb configuration</a>
 * (WEB-INF/cowebConfig.json).
 *
 * <p>In your custom coweb configuration, set both `moderatorIsUpdater` and `operationEngine` to "true".
 * Set `sessionModerator` to the full java class name (e.g. "org.coweb.DefaultSessionModerator").
 *
 * <p>Note that the users of this class make no guarantee about the number of threads that might operate
 * on a SessionModerator object. Thus, implementors of SessionModerator subclasses must ensure the thread
 * safety of the implementation. For example, the {@link SessionModerator#onSync} method likely needs to
 * be declared synchronized.
 *
 */
public abstract class SessionModerator {

	/**
	  * The default SessionModerator implementation used by {@link org.coweb.SessionModerator#getInstance}.
	  */
	private static final String DefaultImpl = "org.coweb.DefaultSessionModerator";

	/* Each cowebkey has one SessionModerator. */
	private static HashMap<String, SessionModerator> instancesMap =
		new HashMap<String, SessionModerator>();

	protected SessionHandler sessionHandler = null;

	/* Upon creating a LocalSession, a respective ServerSession object is created.
	   Make sure both have the same attributes set: use {@link SessionModerator#setSessionAttribute}
	 */
	protected LocalSession localSession = null;
	protected ServerSession serverSession = null;

	private Set<CollabInterface> collabInterfaces;

	/**
	  * Use {@link SessionModerator#getInstance} to obtain a SessionModerator object.
	  */
	protected SessionModerator() {
		;
	}

	/**
	  * Use {@link SessionModerator#getInstance} to obtain a SessionModerator object.
	  */
	protected SessionModerator(SessionHandler sessionHandler) {

	}

	/** 
	  * Returns the SessionModerator instance for a given confKey.
	  * The session moderator is either 1) given by the parameter classStr or
	  * 2) SessionModerator.DefaultImpl if classStr is null.
	  *
	  * <p>If no SessionModerator exists for the confKey, a new instance is created and initialized.
	  * The sessionid attribute is always updated to that of sessionHandler.
	  *
	  * <p>The implicit assumption is that there exists a one-to-one correspondence between SessionHandler
	  * objects and confKeys.
	  *
	  * @param sessionHandler used to initialize the newly created SessionModerator, if one was created
	  * @param classStr SessionModerator implementation to create
	  * @param confKey cowebkey
	  * @return	null if the SessionModerator class fails to be constructed or initialized.
	  */
	public static synchronized SessionModerator getInstance(
			SessionHandler sessionHandler, String classStr, String confKey) {

		/* Should there be one SessionModerator for each cowebkey? It looks like by
		   using getInstance, atmost 1 SessionModerator object will *ever* be created. */
		SessionModerator mod = SessionModerator.instancesMap.get(confKey);
		if (null == mod) {
			if (classStr == null) {
				classStr = SessionModerator.DefaultImpl;
			}

			try {
				Class<? extends SessionModerator> c = Class.forName(classStr)
						.asSubclass(SessionModerator.class);
				mod = c.newInstance();
				mod.init(sessionHandler);
				SessionModerator.instancesMap.put(confKey, mod);
			} catch (Exception e) {
				e.printStackTrace();
			}
		} else {
			mod.updateSessionHandler(sessionHandler);
		}

		return mod;
	}

	/**
	  * Creates a bayeux server-client pair for this session moderator. Both
	  * the LocalSession and ServerSession objects are set here.
	  */
	private void init(SessionHandler sessionHandler) {
		this.collabInterfaces = new HashSet<CollabInterface>();

		this.sessionHandler = sessionHandler;
		BayeuxServer server = SessionManager.getInstance().getBayeux();

		String sessionId = sessionHandler.getSessionId();
		this.localSession = server.newLocalSession(sessionId);
		this.localSession.setAttribute("sessionid", sessionId);
		this.localSession.handshake();
		this.serverSession = this.localSession.getServerSession();
		this.setSessionAttribute("sessionid", sessionId);
		this.setSessionAttribute("username", "moderator");
	}

	/**
	  * Updates the LocalSession and ServerSession attributes given a SessionHandler.
	  * 
	  * <p>Visibility is default - only package level should access it.
	  *
	  * @param handler determines attributes to update
	  */
	void updateSessionHandler(SessionHandler handler) {
		this.sessionHandler = handler;
		this.setSessionAttribute("sessionid", handler.getSessionId());
	}

	/**
	  * Returns the associated LocalSession object - this represents the moderator when considered
	  * a "client" on the server. All messages originating from the moderator should come <b>from</b> the
	  * LocalSession.
	  * 
	  * @return the associated LocalSession
	  */
	public LocalSession getLocalSession() {
		return this.localSession;
	}

	/**
	  * Returns the associated ServerSession object. Any messages sent <b>to</b> the moderator will
	  * have this ServerSession object as the recipient.
	  * 
	  * @return the associated ServerSession
	  */
	public ServerSession getServerSession() {
		return this.serverSession;
	}

	/**
	  *
	  * A SessionModerator is special - it has an associated ServerSession like all
	  * "clients," but also has a LocalSession. Attributes will typically be synchronized.
	  * so use this method to set an attribute in both Session objects.
	  *
	  * <p>For any attributes that SHOULD not be shared, use getLocalSession or getServerSession
	  * and set the attribute on that object only.
	  *
	  * @see org.cometd.bayeux.Session#setAttribute
	  */
	public void setSessionAttribute(String key, Object val) {
		this.localSession.setAttribute(key, val);
		this.serverSession.setAttribute(key, val);
	}

	/**
	 * Called when a client sends a sync message. This sync event will have been
	 * processed by the operation engine.
	 * 
	 * @param data Map with the following properties<br />
	 *             String topic,<br />
	 *             String type,<br />
	 *             int    site,<br />
	 *             Map    value,<br />
	 *             int    position
	 */
	public abstract void onSync(Map<String, Object> data);

	/**
	  *
	  * Return a mapping of collab element IDs to application state. For example,
	  * for a conference session with two collaborative elements ("foo" and "bar"),
	  * this method will return a map with the pairs ("foo", fooStateObj) and
	  * ("bar", barStateObj).
	  *
	  * <p>null should *not* be returned under any circumstance.
	  *
	  * @return collab application state map
	  */
	public abstract Map<String, Object> getLateJoinState();

	/**
	  * Should determine whether or not a connecting client can join a session.
	  *
	  * @param client client attempting to join
	  * @return whether or not the client can join
	  */
	public abstract boolean canClientJoinSession(ServerSession client);

	/**
	  * Called to notify this moderator when a client has subscribed to updates.
	  *
	  * @param client client that just subscribed
	  */
	public abstract void onClientJoinSession(ServerSession client);

	/**
	  * Called to notify this moderator that a client has left the session.
	  *
	  * @param client client that just left the session
	  */
	public abstract void onClientLeaveSession(ServerSession client);

	/**
	  * Should determine whether or not a client can subscribe to bot messages.
	  *
	  * @param client client that wants to subscribe to bot messages
	  * @return whether or not client can subscribe to bot messages
	  */
	public abstract boolean canClientSubscribeService(ServerSession client);

	/**
	  * Should determine whether or not a client can publish messages to bots.
	  *
	  * @param client that wants to publish messages
	  * @param botMessage message the client wants to publish
	  * @return whether or not the client can publish
	  */
	public abstract boolean canClientMakeServiceRequest(ServerSession client,
			Message botMessage);

	/**
	  * Called whenever a bot responds to a service message sent by this moderator.
	  * @param botResponse the bot's message
	  */
	public abstract void onServiceResponse(Message botResponse);

	/**
	  * Called whenever a session is over (i.e.&nbsp;all clients have left). Note that this
	  * SessionModerator object will still be kept in memory if moderatorIsUpdater and
	  * reused for any future coweb sessions with the same cowebkey.
	  *
	  * <p>All CollabInterface objects created prior to onSessionEnd() being called
	  * are now invalid and can no longer be used.
	  *
	  * <p>If this moderator is not the updater, it is recommended that subclasses
	  * use this method to help in resetting application state to a fresh state
	  * incase a new session is initiated with the same cowebkey. Otherwise, the
	  * browser clients will be out of sync with the moderator's state.
	  *
	  * <p>This is important, because once a moderator is created for a specific cowebkey,
	  * it is never destroyed, even if the session is ended.
	  */
	public abstract void onSessionEnd();

	/**
	 * Called when all clients have left a session. This method invokes the
	 * onSessionEnd() callback.
	 */
	void endSession() {
		for (CollabInterface ci: this.collabInterfaces) {
			this.serverSession.removeListener(ci);
		}
		this.collabInterfaces.clear();
		this.sessionHandler = null;
		this.onSessionEnd();
	}

	/**
	 * Callback when this a session has been created and joined by at least one
	 * other external client. Note that this may be called multiple times in the
	 * lifetime of a SessionModerator, because a moderator persists even when
	 * all clients leave a session. When a new client joins a session that already
	 * existed beforehand, this method will be called to notify the moderator that
	 * the session is now "active" again.
	 */
	public abstract void onSessionReady();

	/**
	 * Create a CollabInterface for use with this moderator. This method should
	 * only be called when onSessionReady() has been invoked more recently than
	 * onSessionEnd().
	 *
	 * <p>Once onSessionEnd() has been invoked, all CollabInterface
	 * objects become invalid, and new ones can only be created once the session
	 * becomes active again (i.e. onSessionReady() is invoked again).
	 *
	 * @param collabId Identifier for this collaborative object.
	 */
	public CollabInterface initCollab(String collabId) {
		CollabInterface ci = new CollabInterface(this, collabId);
		this.serverSession.addListener(ci);
		this.collabInterfaces.add(ci);
		return ci;
	}

	/**
	 * Provide a simple interface for sending collaborative messages. This provides
	 * similar functionality to the JavaScript CollabInterface; since
	 * SessionModerator provides much of the functionality of the JavaScript
	 * CollabInterface, this Java CollabInterface only provides methods to send
	 * data. Receiving data is handled by the moderator.
	 */
	public class CollabInterface implements ServerSession.MessageListener {

		private SessionModerator moderator;
		private String collabId;
		private int serviceId;

		/**
		 * Create a collaborative object interface for sending collab messages to
		 * other clients in an OCW session. Used primarily with the moderator.
		 * @param collabId Identifier for this collaborative object.
		 */
		private CollabInterface(SessionModerator mod, String collabId) {
			this.moderator = mod;
			this.collabId = collabId;
			this.serviceId = 0;
		}

		public boolean onMessage(ServerSession to, ServerSession from, ServerMessage message) {
			this.moderator.onServiceResponse(message);
			return true;
		}

		/**
		 * Send an application sync event.
		 * @param name Which application property changed.
		 * @param value New property value, JSON encodable.
		 * @param type One of {"insert", "delete", "update", null}
		 * @param position Position of the value change.
		 */
		public void sendSync(String name, Object value, String type, int position) {
			name = "coweb.sync." + name + "." + this.collabId;
			this.moderator.sessionHandler.publishModeratorSync(name, value, type, position);
		}

		/**
		 * Send a message to a service bot.
		 * @param service Bot service name.
		 * @param params Bot message, JSON encodable.
		 */
		public synchronized void postService(String service, Map<String, Object> params) {
			String topic = "coweb.service.request." + service + "_" + this.serviceId +
				"." + this.collabId;
			++this.serviceId;
			System.out.println("postService " + topic);
			this.moderator.sessionHandler.postModeratorService(service, topic, params);
		}

	}

}

