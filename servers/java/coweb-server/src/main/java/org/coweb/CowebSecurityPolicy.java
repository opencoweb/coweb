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

/**
 * Provides an extension point to handle permission checks for
 * coweb protocol events.
 * 
 */
public class CowebSecurityPolicy extends DefaultSecurityPolicy {

    public CowebSecurityPolicy() {
    }
    
    @Override
    public final boolean canPublish(BayeuxServer server,
    		ServerSession client,
    		ServerChannel channel,
    		ServerMessage message) {
    	String channelName = channel.toString();
    	String username = (String)client.getAttribute("username");
		String sessionid = (String)client.getAttribute("sessionid");
		
		if(channelName.startsWith("/service/bot")) {
			return this.canInvokeServiceRequest(username, 
					sessionid,
					ServiceHandler.getServiceNameFromChannel(channelName, false));
		}
		
		return super.canPublish(server, client, channel, message);
    }
    
    @Override
    public final boolean canSubscribe(BayeuxServer server,
    		ServerSession client,
    		ServerChannel channel,
    		ServerMessage message) {
    	
    	String channelName = (String)message.get(Message.SUBSCRIPTION_FIELD);
    	String username = (String)client.getAttribute("username");
		String sessionid = (String)client.getAttribute("sessionid");
		
		if(username == null || sessionid == null)
			return false;	
		
		if(channelName.startsWith("/bot")) {			
			return this.canSubscribeService(username,
					sessionid,
					ServiceHandler.getServiceNameFromChannel(channelName, true));
		}
		else 
			return this.canSubscribeOther(server, client, channel, message);
    }
    
    @Override
	public boolean canHandshake(BayeuxServer bayeuxServer, ServerSession client,
			ServerMessage message) {

    	if(client.getLocalSession() != null)
    		return super.canHandshake(bayeuxServer, client, message);
    	
    	SessionManager manager = SessionManager.getInstance();
    	if(manager == null) {
    		return true;
    	}
    	
    	SessionHandler handler = manager.getSessionHandler(message);
    	boolean allowed = false;
		//String sessionid = SessionManager.getSessionIdFromMessage(message);
	    
		if(handler != null) {
			HttpTransport transport = (HttpTransport)bayeuxServer.getCurrentTransport();
			HttpServletRequest req = transport.getCurrentRequest();

			String username = req.getRemoteUser();
            if(username == null) 
                username = "anonymous";
            
            allowed = this.canSubscribeToSession(username, 
            		handler.getConfKey());
            		

            if(allowed) {
            	client.setAttribute("username", username);
            	client.setAttribute("sessionid", handler.getSessionId());
            }
           
		}
		
		return allowed;
	}
    
    
    /**
     * Called when a client subscribes to a non coweb channel.
     * 
     * @param server Cometd BayeuxServer
     * @param client Client invoking the subscribe
     * @param channel Channel client is subscribing to.
     * @param message Bayeux message request was wrapped in.
     * @return true if the client can subscribe to this channel.
     */
    public boolean canSubscribeOther(BayeuxServer server,
    		ServerSession client,
    		ServerChannel channel,
    		ServerMessage message) {
    	return true;
    }

    /**
     * Called when a user preps a session.
     * 
     * @param username User attempting the prep request
     * @param key Conference Key
     * @param collab If this conference is collaborative
     * @return true if the user is allowed to make a prep request.
     */
    public boolean canAdminRequest(String username, 
            String key, 
            boolean collab) {
        return true;
    }
    
    /**
     * Called when a user attempts to join a session.
     * 
     * @param username User attempting to join a session.
     * @param key Coweb key associated with this session.
     * @param collab true is this session is collaborative.
     * @return true if the user is allowed to join the session.
     */
    public boolean canSubscribeToSession(String username, String key, boolean collab) {
    	return true;
    }
 
   /**
    * Called when a user attempts to join a session.
    * 
    * @param username User attempting to join a session.
    * @param sessionid Id of the session
    * @return true if the user is allowed to join the session.
    */
    public boolean canSubscribeToSession(String username, String sessionid) {
    	return true;
    }
    
    /**
     * Called when a user attempts to send a private message to a bot.
     * 
     * @param username User attempting to make the request.
     * @param sessionid Id of the session
     * @param serviceName Name of the service the bot provides.
     * @return true if the user is allowed to make the request.
     */
    public boolean canInvokeServiceRequest(String username, 
			String sessionid,
			String serviceName) {
    	return true;
    }

    /**
     * Called when a user attempts to subscribe to a service bot.
     * 
     * @param username User attempting to subscribe
     * @param sessionid Id of the session
     * @param serviceName Name of the service the bot provides.
     * @return true if the user is allowed to subscribe.
     */
    public boolean canSubscribeService(String username,
			String sessionid,
			String serviceName) {
    	return true;
    }
}
