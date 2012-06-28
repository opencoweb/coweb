package org.coweb;

import java.util.Map;
import java.util.HashMap;

import org.cometd.bayeux.Message;
import org.cometd.bayeux.server.BayeuxServer;
import org.cometd.bayeux.server.LocalSession;
import org.cometd.bayeux.server.ServerSession;

/**
 * TODO Config Options
 * 
 * 1. Sync events through OT. 2. Moderator Impl. 3. Moderator handles late join.
 * #1 must be true. 4.
 */
public abstract class SessionModerator {

	/**
	  * The default SessionModerator implementation used by {@link org.coweb.SessionModerator#newInstance}.
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

	/**
	  * Use {@link SessionModerator#newInstance} to obtain a SessionModerator object.
	  */
	protected SessionModerator() {
		;
	}

	/**
	  * Use {@link SessionModerator#newInstance} to obtain a SessionModerator object.
	  */
	protected SessionModerator(SessionHandler sessionHandler) {

	}

	/** 
	  * Returns the SessionModerator instance for a given confKey.
	  * The session moderator is either 1) given by the parameter classStr or
	  * 2) SessionModerator.DefaultImpl if classStr is null.
	  *
	  * If no SessionModerator exists for the confKey, a new instance is created and initialized.
	  * The sessionid attribute is always updated to that of sessionHander.
	  *
	  * The implicit assumption is that there exists a one-to-one correspondence between SessionHandler
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
		   using newInstance, atmost 1 SessionModerator object will *ever* be created. */
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

	private void init(SessionHandler sessionHandler) {
		this.sessionHandler = sessionHandler;
		BayeuxServer server = SessionManager.getInstance().getBayeux();

		String sessionId = sessionHandler.getSessionId();
		this.localSession = server.newLocalSession(sessionId);
		this.localSession.setAttribute("sessionid", sessionId);
		this.localSession.handshake();
		this.serverSession = this.localSession.getServerSession();
		this.setSessionAttribute("sessionid", sessionId);
	}

	/**
	  * Updates the LocalSession and ServerSession attributes given a SessionHandler.
	  * This is useful whenever a SessionHandler object is created, for example.
	  * 
	  * Visibility is default - only package level should access it.
	  * @param handler determines attributes to update
	  */
	void updateSessionHandler(SessionHandler handler) {
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
	  * For any attributes that SHOULD not be shared, use getLocalSession or getServerSession
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
	 * @param data Map with the following properties
	 * 					String topic,
	 * 					int    site,
	 *                  Map    value,
	 *                  int    position,
	 * 
	 * @return true if this sync event should forwarded to the bots
	 */
	public abstract boolean onSync(Map<String, Object> data);

	/**
	  *
	  * Return a mapping of collab element IDs to application state. For example,
	  * for a conference session with two collaborative elements ("foo" and "bar"),
	  * this method will return a map with the pairs ("foo", fooStateObj) and
	  * ("bar", barStateObj).
	  *
	  * null should not be returned.
	  *
	  * @return collab application state map
	  */
	public abstract Map<String, Object> getLateJoinState();

	// TODO document

	public abstract boolean canClientJoinSession(ServerSession client);

	public abstract void onClientJoinSession(ServerSession client);

	public abstract void onClientLeaveSession(ServerSession client);

	public abstract boolean canClientSubscribeService(ServerSession client);

	public abstract boolean canClientMakeServiceRequest(ServerSession client,
			Message botMessage);

	public abstract void onServiceResponse(Message botResponse);

	public abstract void onSessionEnd();

}
