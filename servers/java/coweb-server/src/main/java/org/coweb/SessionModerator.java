package org.coweb;

import java.util.Map;

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
	private static SessionModerator instance = null;

	protected SessionHandler sessionHandler = null;
	protected LocalSession serverSession = null;

	protected SessionModerator() {
		;
	}

	protected SessionModerator(SessionHandler sessionHandler) {

	}

	public static synchronized SessionModerator newInstance(
			SessionHandler sessionHandler, Map<String, Object> config) {

		if (SessionModerator.instance == null) {
			String classStr = (String) config.get("sessionModerator");
			if (classStr == null) {
				classStr = SessionModerator.DefaultImpl;
			}

			try {
				Class<? extends SessionModerator> c = Class.forName(classStr)
						.asSubclass(SessionModerator.class);
				SessionModerator mod = c.newInstance();
				mod.init(sessionHandler);

				SessionModerator.instance = mod;
			} catch (Exception e) {
				e.printStackTrace();
			}
		}

		return SessionModerator.instance;
	}

	private void init(SessionHandler sessionHandler) {
		this.sessionHandler = sessionHandler;
		BayeuxServer server = SessionManager.getInstance().getBayeux();

		String sessionId = sessionHandler.getSessionId();
		this.serverSession = server.newLocalSession(sessionId);
		this.serverSession.setAttribute("sessionId", sessionId);
		this.serverSession.handshake();
	}

	public LocalSession getServerSession() {
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
