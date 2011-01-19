/**
 * Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
 */
package org.coweb;

import org.cometd.bayeux.server.BayeuxServer;
import org.cometd.bayeux.server.ServerMessage;
import org.cometd.bayeux.server.ServerSession;
import org.cometd.bayeux.server.ServerChannel;
import org.cometd.bayeux.Message;

import org.cometd.server.transport.HttpTransport;
import org.cometd.server.DefaultSecurityPolicy;

import javax.servlet.http.HttpServletRequest;

public class CowebSecurityPolicy extends DefaultSecurityPolicy {

    public CowebSecurityPolicy() {
    }

    public boolean canAdminRequest(String username, 
            String key, 
            boolean collab) {
        return true;
    }

    public boolean onSessionRequest(String session, String username) {
        return true;
    }

	@Override
	public boolean canHandshake(BayeuxServer bayeuxServer, ServerSession client,
			ServerMessage message) {
		
		System.out.println("CowebSecurityPolicy::canHandshake");
		System.out.println(message);

		String sessionid = SessionManager.getSessionIdFromMessage(message);
		System.out.println(sessionid);
		if(sessionid != null) {

			HttpTransport transport = (HttpTransport)bayeuxServer.getCurrentTransport();
			HttpServletRequest req = transport.getCurrentRequest();

			String username = req.getRemoteUser();
            if(username == null) 
                username = "anonymous";

			client.setAttribute("username", username);
			client.setAttribute("sessionid", sessionid);
		}

		return super.canHandshake(bayeuxServer, client, message);
	}

}
