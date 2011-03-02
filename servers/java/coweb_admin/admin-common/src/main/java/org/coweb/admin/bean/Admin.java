package org.coweb.admin.bean;

import java.util.Map;
import java.util.List;

import javax.ejb.Remote;

import org.coweb.admin.acls.SessionAcls;

@Remote
public interface Admin {

    public int registerApplication(String title,
            String description,
            String appUrl,
            String thumbnailUrl);

   
    public boolean unregisterApplication(String title);
    
    public boolean unregisterApplication(int appid);

    public boolean createSession(String appTitle,
    		String sessionTitle,
    		String description);

    public SessionAcls getSessionAclsForUser(String username, String sessionid);
    
    public Map<String, Object> getApplication(String appTitle);

    public Map<String, Object> getSession(String appTitle, String sessionId);
    
    public List<Map<String, Object>> getSessionsForUser(int acls,
    		String query,
    		String sortBy,
    		String direction,
    		int offset,
    		int limit);
     
    public List<Map<String, Object>> getApplicationsForUser(String username,
            Map<String, Object> args);
}

