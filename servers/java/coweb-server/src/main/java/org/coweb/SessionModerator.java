
package org.coweb;

import java.util.Map;
import java.util.HashMap;
import java.util.Set;
import java.util.HashSet;
import java.util.concurrent.atomic.AtomicInteger;

import java.util.logging.Logger;

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
 * <p>In your custom coweb configuration, set both `moderatorIsUpdater` and
 * `operationEngine` to "true". Set `sessionModerator` to the full java class
 * name (e.g. "org.coweb.DefaultSessionModerator").
 *
 * <p>Note that the users of this class make no guarantee about the number of
 * threads that might operate on a SessionModerator object. Thus, implementors
 * of SessionModerator subclasses must ensure the thread safety of the
 * implementation. For example, the {@link SessionModerator#onSync} method
 * likely needs to be declared synchronized.
 *
 * The current API has four methods accepting an org.cometd.bayeux.Message
 * argument. Since it is not immediately apparent what information would be
 * useful to application developers, we do not split up the message like we
 * do for onServiceResponse. Until it becomes clear how to send specific
 * information that is encoded inside the message, the API will continue to
 * pass a message, but developers should be aware that the format of the message
 * is not guaranteed to change with new releases.
 *
 */
public abstract class SessionModerator {

	private static final Logger log = Logger.getLogger(SessionHandler.class
			.getName());

	/**
	  * The default SessionModerator implementation used by
	  * {@link org.coweb.SessionModerator#getInstance}.
	  */
	private static final String DefaultImpl =
		"org.coweb.DefaultSessionModerator";

	/* Each cowebkey has one SessionModerator. */
	private static HashMap<String, SessionModerator> instancesMap =
		new HashMap<String, SessionModerator>();

	protected SessionHandler sessionHandler = null;

	/* Upon creating a LocalSession, a respective ServerSession object is
	 * created. Make sure both have the same attributes set: use
	 * {@link SessionModerator#setSessionAttribute}.
	 */
	protected LocalSession localSession = null;
	protected ServerSession serverSession = null;

	private Set<CollabInterface> collabInterfaces;

	/**
	  * Use {@link SessionModerator#getInstance} to obtain a SessionModerator
	  * object.
	  */
	protected SessionModerator() {
		;
	}

	/**
	  * Use {@link SessionModerator#getInstance} to obtain a SessionModerator
	  * object.
	  */
	protected SessionModerator(SessionHandler sessionHandler) {

	}

	/** 
	  * Returns the SessionModerator instance for a given confKey.
	  * The session moderator is either 1) given by the parameter classStr or
	  * 2) SessionModerator.DefaultImpl if classStr is null.
	  *
	  * <p>If no SessionModerator exists for the confKey, a new instance is
	  * created and initialized. The sessionid attribute is always updated to
	  * that of sessionHandler.
	  *
	  * <p>The implicit assumption is that there exists a one-to-one
	  * correspondence between SessionHandler
	  * objects and confKeys.
	  *
	  * @param sessionHandler used to initialize the newly created
	  *        SessionModerator, if one was created
	  * @param classStr SessionModerator implementation to create
	  * @param confKey cowebkey
	  * @return	null if the SessionModerator class fails to be constructed or
	  *         initialized.
	  */
	public static synchronized SessionModerator getInstance(
			SessionHandler sessionHandler, String classStr, String confKey) {

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
	  * Updates the LocalSession and ServerSession attributes given a
	  * SessionHandler.
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
	  * Returns the associated LocalSession object - this represents the
	  * moderator when considered a "client" on the server. All messages
	  * originating from the moderator should come <b>from</b> the LocalSession.
	  * 
	  * @return the associated LocalSession
	  */
	public LocalSession getLocalSession() {
		return this.localSession;
	}

	/**
	  * Returns the associated ServerSession object. Any messages sent <b>to</b>
	  * the moderator will have this ServerSession object as the recipient.
	  * 
	  * @return the associated ServerSession
	  */
	public ServerSession getServerSession() {
		return this.serverSession;
	}

	/**
	  * A SessionModerator is special - it has an associated ServerSession like
	  * all "clients," but also has a LocalSession. Attributes will typically be
	  * synchronized. so use this method to set an attribute in both Session
	  * objects.
	  *
	  * <p>For any attributes that SHOULD not be shared, use getLocalSession or
	  * getServerSession and set the attribute on that object only.
	  *
	  * @param key attribute key
	  * @param val attribute value
	  * @see org.cometd.bayeux.Session#setAttribute
	  */
	public void setSessionAttribute(String key, Object val) {
		this.localSession.setAttribute(key, val);
		this.serverSession.setAttribute(key, val);
	}

	/**
	 * The coweb server calls this anytime the server’s local operation engine
	 * determines there is a sync event to apply to the moderator’s local copy
	 * of the application data structure(s). Like coweb browser applications,
	 * the implementors must honor and apply all sync events to local data
	 * structure(s).
	 *
	 * <p>This method should return whether or not the sync event should be
	 * forwarded to bots.
	 *
	 * <p>The parameter data has the five keys specified below.
	 * 	  <li> topic - A string specifying the coweb topic for which the message
	 * 	  was sent. This is useful to distinguish browser collab objects and
	 * 	  sendSync topic names that operations are sent on.
	 * 	  <li> type - String specifying the type of sync. This can be one of
	 * 	  {insert, delete, update, null}.
	 * 	  <li> site - Integer site ID where the event originated.
	 * 	  <li> value - JSON object value representing the new value. See
	 * 	  org.eclipse.jetty.util.ajax.JSON for how to read this object.
	 * 	  <li> position - Integer position specifying where in the
	 * 	  one-dimensional array the operation should be applied.
	 * 
	 * @param clientId string identifier of client
	 * @param data Map with sync data as described above.
	 */
	public abstract void onSync(String clientId, Map<String, Object> data);

	/**
	 * Return a mapping of collab element IDs to application state. The coweb
	 * server calls this when a new client joins a coweb sessiob. The 
	 * <i>moderatorIsUpdater</i> boolean configuration option must be set to
	 * true, * so that the server knows to call this method (otherwise other
	 * clients are late join updaters).
	 *
	 * <p>The function should return a (key, value) map where there is one key
	 * for each collab object in the coweb application. The key should be the
	 * collab object ID, and the associated value should be a JSON object
	 * representing the state of that collab object.
	 *
	 * <p>For example, for a conference session with two collaborative elements
	 * ("foo" and "bar"), this method will return a map with the pairs ("foo",
	 * fooStateObj) and ("bar", barStateObj).
	 *
	 * <p>null should *not* be returned under any circumstance.
	 *
	 * @return collab application state map
	 */
	public abstract Map<String, Object> getLateJoinState();

	/**
	 * Determines whether or not a connecting client can join a session.
	 *
	 * @param clientId string identifier of client
	 * @param userDefined arbitrary data sent by the coweb application. See the
	 *        org.eclipse.jetty.util.ajax.JSON class.
	 * @return whether or not the client can join
	 */
	public abstract boolean canClientJoinSession(String clientId,
			Map<String, Object> userDefined);

	/**
	 * Called to notify this moderator when a client has subscribed to updates.
	 *
	 * @param clientId string identifier of client
	 */
	public abstract void onClientJoinSession(String clientId);

	/**
	 * Called to notify this moderator that a client has left the session.
	 *
	 * @param clientId string identifier of client
	 */
	public abstract void onClientLeaveSession(String clientId);

	/**
	 * Should determine whether or not a client can subscribe to bot messages.
	 *
	 * @param svcName service name
	 * @param clientId string identifier of client
	 * @return whether or not client can subscribe to bot messages
	 */
	public abstract boolean canClientSubscribeService(String svcName,
			String clientId);

	/**
	 * Should determine whether or not a client can publish messages to bots.
	 *
	 * @param svcName service name
	 * @param clientId string identifier of client
	 * @param botData Data intended to be sent to the bot. See the
	 *        org.eclipse.jetty.util.ajax.JSON class.
	 * @return whether or not the client can publish
	 */
	public abstract boolean canClientMakeServiceRequest(String svcName,
			String clientId, Map<String, Object> botData);

	/**
	 * Called whenever a bot responds to a service message sent by this
	 * moderator.
	 * @param svcName The bot's name.
	 * @param data Bot message data as a JSON encodable map. Might be null.
	 * @param error Was there an error?
	 * @param isPublic Was the message a public bot broadcast?
	 */
	public abstract void onServiceResponse(String svcName,
			Map<String, Object> data, boolean error, boolean isPublic);

	/**
	 * Called whenever a session is over (i.e.&nbsp;all clients have left).
	 * Note that this SessionModerator object will still be kept in memory if
	 * moderatorIsUpdater and reused for any future coweb sessions with the
	 * same cowebkey.
	 *
	 * <p>All CollabInterface objects created prior to onSessionEnd() being
	 * called are now invalid and can no longer be used.
	 *
	 * <p>If this moderator is not the updater, it is recommended that
	 * subclasses use this method to help in resetting application state to a
	 * fresh state incase a new session is initiated with the same cowebkey.
	 * Otherwise, the browser clients will be out of sync with the moderator's
	 * state.
	 *
	 * <p>This is important, because once a moderator is created for a specific
	 * cowebkey, it is never destroyed, even if the session is ended.
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
	 * all clients leave a session. When a new client joins a session that
	 * already existed beforehand, this method will be called to notify the
	 * moderator that the session is now "active" again.
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
	 * Provide a simple interface for sending collaborative messages. This
	 * provides similar functionality to the JavaScript CollabInterface; since
	 * SessionModerator provides much of the functionality of the JavaScript
	 * CollabInterface, this Java CollabInterface only provides methods to send
	 * data. Receiving data is handled by the moderator.
	 */
	public static class CollabInterface
			implements ServerSession.MessageListener {

		private SessionModerator moderator;
		private String collabId;
		private AtomicInteger serviceId;

		/**
		 * Create a collaborative object interface for sending collab messages
		 * to other clients in an OCW session.
		 * @param collabId Identifier for this collaborative object.
		 */
		private CollabInterface(SessionModerator mod, String collabId) {
			this.moderator = mod;
			this.collabId = collabId;
			this.serviceId = new AtomicInteger(0);
		}

		public void subscribeService(String svcName) {
			this.moderator.sessionHandler.subscribeModeratorToService(svcName);
		}

		public boolean onMessage(ServerSession to, ServerSession from,
				ServerMessage message) {
			if (ServiceHandler.isServiceMessage(message)) {
				String svcName = ServiceHandler.getServiceNameFromMessage(
						message);

				Map<String, Object> data = message.getDataAsMap();
				Boolean error = (Boolean)data.get("error");
				if (null == error)
					error = false;
				data = (Map<String, Object>)data.get("value");

				/* No guarantees that data is not null. */
				this.moderator.onServiceResponse(svcName, data, error,
						ServiceHandler.isPublicBroadcast(message));
			} else {
				log.warning("CollabInterface received message it doesn't " +
						"understand: " + message);
			}
			return true;
		}

		/**
		 * Send an application sync event.
		 * @param name Which application property changed.
		 * @param value New property value, JSON encodable.
		 * @param type One of {"insert", "delete", "update", null}
		 * @param position Position of the value change.
		 */
		public void sendSync(String name, Object value, String type,
				int position) {
			name = "coweb.sync." + name + "." + this.collabId;
			this.moderator.sessionHandler.publishModeratorSync(name, value,
					type, position);
		}

		/**
		 * Send a message to a service bot.
		 * @param service Bot service name.
		 * @param params Bot message, JSON encodable.
		 */
		public void postService(String service, Map<String, Object> params) {
			/* Need atomicity for serviceId counter. */
			int id = this.serviceId.getAndIncrement();
			String topic = "coweb.service.request." + service + "_" + id +
				"." + this.collabId;
			this.moderator.sessionHandler.postModeratorService(service, topic,
					params);
		}

	}

}

