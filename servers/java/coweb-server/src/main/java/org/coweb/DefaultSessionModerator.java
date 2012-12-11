/**
 * 
 */
package org.coweb;

import java.util.Map;
import java.util.HashMap;

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
	 */
	@Override
	public void onSync(String clientId, Map<String, Object> data) {
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
	 */
	@Override
	public boolean canClientJoinSession(String clientId,
			Map<String, Object> userDefined) {
		return true;
	}

	/*
	 * (non-Javadoc)
	 * 
	 */
	@Override
	public void onClientJoinSession(String clientId) {
		return;
	}

	/*
	 * (non-Javadoc)
	 * 
	 */
	@Override
	public void onClientLeaveSession(String clientId) {
		return;
	}

	/*
	 * (non-Javadoc)
	 * 
	 */
	@Override
	public boolean canClientSubscribeService(String svcName, String clientId) {
		return true;
	}

	/*
	 * (non-Javadoc)
	 * 
	 */
	@Override
	public boolean canClientMakeServiceRequest(String svcName,
			String clientId, Map<String, Object> botData) {
		return true;
	}

	/*
	 * (non-Javadoc)
	 * 
	 */
	@Override
	public void onServiceResponse(String svcName, Map<String, Object> data,
			boolean error, boolean isPublic) {
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

