package org.coweb.admin;

import java.util.Map;
import java.util.List;

import org.coweb.admin.acls.SessionAcls;

public interface Admin {

    public int registerApplication(String user,
            String title,
            String description,
            String appUrl,
            String thumbnailUrl);

   
    public boolean unregisterApplication(String user, String title);
    
    public boolean unregisterApplication(String user, int appid);

    public boolean createSession(String user,
            String appTitle,
    		String sessionTitle,
    		String description,
    		Map<String, Integer> aclsDict);

    public SessionAcls getSessionAclsForUser(String user, String sessionid);
    
    public Map<String, Object> getApplication(String user, String appTitle);

    public Map<String, Object> getSession(String user, String appTitle, String sessionId);
    
    public List<Map<String, Object>> getSessionsForUser(String user,
            int acls,
    		String query,
    		String sortBy,
    		String direction,
    		int offset,
    		int limit);
     
    public List<Map<String, Object>> getApplicationsForUser(String username,
            Map<String, Object> args);
}
