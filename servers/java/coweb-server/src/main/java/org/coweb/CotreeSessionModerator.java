/**
 * 
 */
package org.coweb;

import java.util.Map;

import org.cometd.bayeux.Message;
import org.cometd.bayeux.server.ServerSession;

/**
 * @author bouchon
 * 
 */
public class CotreeSessionModerator extends DefaultSessionModerator {

	public CotreeSessionModerator() {
		super();
	}

	public CotreeSessionModerator(SessionHandler sessionHandler) {
		super(sessionHandler);
	}
	
	@Override
	public boolean onSync(Map<String, Object> data) {
		System.out.println(data);
		return true;
	}

	@Override
	public Object[] getLateJoinState() {
		return null;
	}

	@Override
	public boolean canClientJoinSession(ServerSession client) {
		return true;
	}

	@Override
	public void onClientJoinSession(ServerSession client) {
		return;
	}

	@Override
	public void onClientLeaveSession(ServerSession client) {
		return;
	}

	@Override
	public boolean canClientSubscribeService(ServerSession client) {
		return true;
	}

	@Override
	public boolean canClientMakeServiceRequest(ServerSession client, Message botMessage) {
		return true;
	}

	@Override
	public void onServiceResponse(Message botResponse) {
		return;
	}

	@Override
	public void onSessionEnd() {
		return;
	}
	
}
