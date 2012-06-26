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

	private static final String DefaultImpl = "org.coweb.DefaultSessionModerator";

	/* Each cowebkey has one SessionModerator */
	private static HashMap<String, SessionModerator> instancesMap =
		new HashMap<String, SessionModerator>();

	protected SessionHandler sessionHandler = null;
	/* Upon creating a LocalSession, a respective ServerSession object is created.
	   Make sure both have the same attributes set. */
	protected LocalSession localSession = null;
	protected ServerSession serverSession = null;

	protected SessionModerator() {
		;
	}

	protected SessionModerator(SessionHandler sessionHandler) {

	}

	public static synchronized SessionModerator newInstance(
			SessionHandler sessionHandler, Map<String, Object> config, String confKey) {

		/* Should there be one SessionModerator for each cowebkey? It looks like by
		   using newInstance, atmost 1 SessionModerator object will *ever* be created. */
		SessionModerator mod = SessionModerator.instancesMap.get(confKey);
		if (null == mod) {
			String classStr = (String) config.get("sessionModerator");
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
		/* Now duplicate the attributes in the ServerSession object. */
		this.serverSession.setAttribute("sessionid", sessionId);
	}

	public LocalSession getLocalSession() {
		return this.localSession;
	}

	public ServerSession getServerSession() {
		return this.serverSession;
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

	public abstract Object[] getLateJoinState();

	public abstract boolean canClientJoinSession(ServerSession client);

	public abstract void onClientJoinSession(ServerSession client);

	public abstract void onClientLeaveSession(ServerSession client);

	public abstract boolean canClientSubscribeService(ServerSession client);

	public abstract boolean canClientMakeServiceRequest(ServerSession client,
			Message botMessage);

	public abstract void onServiceResponse(Message botResponse);

	public abstract void onSessionEnd();

}
