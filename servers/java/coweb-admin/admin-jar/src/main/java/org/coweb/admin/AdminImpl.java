package org.coweb.admin;

import java.util.List;
import java.util.Map;

import javax.annotation.Resource;
import javax.annotation.PostConstruct;
import javax.annotation.security.DeclareRoles;
import javax.annotation.security.RolesAllowed;

import javax.sql.DataSource;
import java.sql.Connection;

import org.coweb.admin.acls.SessionAcls;

public class AdminImpl implements Admin {

    private ConferenceDB db = null;

    @Resource(name="SystemDatasource")
    private DataSource dbsource;
    private Connection dbconnect;
    

    @PostConstruct
    public void initialize() {
        try {
            dbconnect = dbsource.getConnection();
            db = new ConferenceDB(dbconnect);
        }
        catch(Exception e) {
            e.printStackTrace();
        }
    }
          
    public int registerApplication(String username,
            String title,
            String description,
            String appUrl,
            String thumbnailUrl) {
    	
    	System.out.println("Admin::registerApplication");
        return this.db.registerApplication(username,
        		title, 
        		description, 
        		appUrl, 
        		thumbnailUrl);
    }

    public boolean unregisterApplication(String username, String title) {
           
    	System.out.println("AdminBean::unregisterApplication");
        return this.db.unregisterApplication(title);
    }
    
    public boolean unregisterApplication(String username, int appid) {
           
    	System.out.println("AdminBean::unregisterApplication");
        return this.db.unregisterApplication(appid);
    }


    public boolean createSession(String username,
            String appTitle,
    		String sessionTitle,
    		String description,
    		Map<String, Integer> aclsDict) {
    	System.out.println("AdminBean::createSession");
    	System.out.println("username = " + username + " appTitle = " + appTitle);
    	System.out.println("sessionTitle = " + sessionTitle + " description = " + description);
        int sessionId = db.createSession(username, appTitle, sessionTitle, description);
        
        if(sessionId == -1)
        	return false;
        
        if(aclsDict != null && !aclsDict.isEmpty()) {
        	return db.setSessionAcls(sessionId, aclsDict);
        }
        
        return true;
    }

   
    public SessionAcls getSessionAclsForUser(String username, String sessionid) {
    	
    	int acls = db.getSessionAclsForUser(username, sessionid);
    	SessionAcls sessionAcls = new SessionAcls(acls);
    	
    	return sessionAcls;
    }
    
    
    public Map<String, Object> getApplication(String username, String appTitle) {
    	return db.getApplication(username, appTitle);
    }
    
    
    public Map<String, Object> getSession(String username,
            String appTitle, 
            String sessionId) {
    	return db.getSession(username, appTitle, sessionId);
    }
    

    public List<Map<String, Object>> getSessionsForUser(String username,
            int acls,
    		String query,
    		String sortBy,
    		String direction,
    		int offset,
    		int limit) {
    	
        if(query == null)
            query = "";

        if(sortBy == null)
            sortBy = "title";

        if(direction == null) 
            direction = "DESC";

        offset = (offset == -1) ? 0 : offset;
        limit = (limit == -1) ? 30 : limit;

        return db.getSessionsForUser(username,
                acls,
                query,
                sortBy,
                offset,
                limit);
    }

  
    public List<Map<String, Object>> getApplicationsForUser(String username,
            Map<String, Object> args) {
        return null;
    }
}
