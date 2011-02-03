/**
 * Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
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
    
    @Override
    public boolean canSubscribe(BayeuxServer server,
    		ServerSession client,
    		ServerChannel channel,
    		ServerMessage message) {
    	
    	String channelName = (String)message.get(Message.SUBSCRIPTION_FIELD);
    	String username = (String)client.getAttribute("username");
		String sessionid = (String)client.getAttribute("sessionid");
		
		if(username == null || sessionid == null)
			return false;	
		
		if(channelName.equals("/service/session/join/*")) {
			return this.canSubscribeToSession(username, sessionid);
		}
		else if(channelName.startsWith("/service/bot")) {
			this.canInvokeServiceRequest(username, 
					sessionid,
					ServiceHandler.getServiceNameFromChannel(channelName, false));
		}
		else if(channelName.startsWith("/bot")) {
			
			this.canSubscribeBot(username,
					sessionid,
					ServiceHandler.getServiceNameFromChannel(channelName, true));
		}
		
    	return true;
    }
    
    @Override
	public boolean canHandshake(BayeuxServer bayeuxServer, ServerSession client,
			ServerMessage message) {

		String sessionid = SessionManager.getSessionIdFromMessage(message);
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

    
    public boolean canAdminRequest(String username, 
            String key, 
            boolean collab) {
        return true;
    }
 
   
    public boolean canSubscribeToSession(String username, String sessionid) {
    	return true;
    }
    
    public boolean canInvokeServiceRequest(String username, 
			String sessionid,
			String serviceName) {
    	return true;
    }

    public boolean canSubscribeBot(String username,
			String sessionid,
			String serviceName) {
    	return true;
    }
}
