package org.coweb.admin.security;

import javax.ejb.EJB;

import org.coweb.CowebSecurityPolicy;
import org.coweb.SessionHandler;
import org.coweb.SessionManager;

import org.coweb.admin.acls.SessionAcls;
import org.coweb.admin.bean.AdminLocal;

public class SecurityPolicy extends CowebSecurityPolicy {
	
	@EJB
	AdminLocal admin;
	
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
        return this.canSubscribeToSession(username, key, collab);
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
     	
     	SessionAcls acls = admin.getSessionAclsForUser(username, key);
     	if(acls == null) 
     		return false;
     	
     	return acls.canAccessSession();
     }
 
   /**
    * Called when a user attempts to join a session.
    * 
    * @param username User attempting to join a session.
    * @param sessionid Id of the session
    * @return true if the user is allowed to join the session.
    */
    public boolean canSubscribeToSession(String username, String sessionid) {
    	
    	SessionManager manager = SessionManager.getInstance();
    	SessionHandler handler = manager.getSessionHandler(sessionid);
    	
    	return this.canSubscribeToSession(username,
    			handler.getConfKey(),
    			handler.isCollab());
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
