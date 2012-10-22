/**
 * 
 */
package org.coweb;

import java.util.Map;
import java.util.HashMap;

import org.cometd.bayeux.Message;
import org.cometd.bayeux.server.ServerSession;

/**
 * @author bburns
 * 
 */
public class DefaultSessionModerator extends SessionModerator {

	public DefaultSessionModerator() {
		super();
	}

	/**
	 * @param sessionHandler
	 */
	public DefaultSessionModerator(SessionHandler sessionHandler) {
		super(sessionHandler);
	}

	/*
	 * (non-Javadoc)
	 * 
	 * @see
	 * org.coweb.SessionModerator#onSync(org.cometd.bayeux.server.ServerSession,
	 * org.cometd.bayeux.Message)
	 */
	@Override
	public void onSync(Map<String, Object> data) {
	}

	/*
	 * (non-Javadoc)
	 * 
	 * @see org.coweb.SessionModerator#getLateJoinState()
	 */
	@Override
	public Map<String, Object> getLateJoinState() {
		return new HashMap<String, Object>();
	}

	/*
	 * (non-Javadoc)
	 * 
	 * @see
	 * org.coweb.SessionModerator#canClientJoinSession(org.cometd.bayeux.server
	 * .ServerSession)
	 */
	@Override
	public boolean canClientJoinSession(ServerSession client) {
		return true;
	}

	/*
	 * (non-Javadoc)
	 * 
	 * @see
	 * org.coweb.SessionModerator#onClientJoinSession(org.cometd.bayeux.server
	 * .ServerSession)
	 */
	@Override
	public void onClientJoinSession(ServerSession client) {
		return;
	}

	/*
	 * (non-Javadoc)
	 * 
	 * @see
	 * org.coweb.SessionModerator#onClientLeaveSession(org.cometd.bayeux.server
	 * .ServerSession)
	 */
	@Override
	public void onClientLeaveSession(ServerSession client) {
		return;
	}

	/*
	 * (non-Javadoc)
	 * 
	 * @see
	 * org.coweb.SessionModerator#canClientSubscribeService(org.cometd.bayeux
	 * .server.ServerSession)
	 */
	@Override
	public boolean canClientSubscribeService(ServerSession client) {
		return true;
	}

	/*
	 * (non-Javadoc)
	 * 
	 * @see
	 * org.coweb.SessionModerator#canClientMakeServiceRequest(org.cometd.bayeux
	 * .server.ServerSession, org.cometd.bayeux.Message)
	 */
	@Override
	public boolean canClientMakeServiceRequest(ServerSession client,
			Message botMessage) {
		return true;
	}

	/*
	 * (non-Javadoc)
	 * 
	 * @see
	 * org.coweb.SessionModerator#onServiceResponse(org.cometd.bayeux.Message)
	 */
	@Override
	public void onServiceResponse(Message botResponse) {
		return;
	}

	/*
	 * (non-Javadoc)
	 * 
	 * @see org.coweb.SessionModerator#onSessionEnd()
	 */
	@Override
	public void onSessionEnd() {
		return;
	}

	@Override
	public void onSessionReady() {
	}

}

