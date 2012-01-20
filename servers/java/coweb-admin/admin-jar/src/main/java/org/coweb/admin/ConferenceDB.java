package org.coweb.admin;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.HashMap;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.coweb.admin.acls.ApplicationAcls;
import org.coweb.admin.acls.SessionAcls;

public class ConferenceDB {

    private static String ALL = "ALL";
    /*
    private static String appQuery = 
        "SELECT * " +
        "FROM applicationacls " +
        "JOIN applications ON applications.appid = applicationacls.appid  " +
        "WHERE (username = ? AND acls & ? AND  " +
        "      applicationacls.appid NOT IN  " +
        "      (SELECT appid as appid2 FROM applicationacls  " +
        "       WHERE username = ?)) " +
        "UNION " +
        "SELECT * " +
        "FROM applicationacls " +
        "JOIN applications ON applications.appid = applicationacls.appid  " +
        "WHERE (username = ? AND acls & ?) " +
        "ORDER BY title COLLATE NOCASE";
	*/
    private static String REG_APP_QUERY = 
    	"INSERT INTO applications (title, description, appurl, thumbnailurl) " +
    	"VALUES (?, ?, ?, ?)";

	private final static String SESSION_ACLS_CREATE =
    	"INSERT INTO sessionacls (sessionid, username, acls) " +
		"VALUES (?, ? ,?)";
    
	private final static String SESSION_CREATE =
    	"INSERT INTO sessions (appid, title, description, creator) " +
		"VALUES (?, ?, ?, ?)";
    
	/*
    private final static String SESSION_QUERY =
    	"SELECT sessions.sessionid as sessionid, " +
                "sessions.title as title, " +
                "sessions.description as description, " +
                "sessions.appid as appid, " +
                "applications.title as apptitle, " +
                "sessions.schedule as schedule, " +
                "sessions.creator as creator, " +
                "sessions.createdon as createdon, " +
                "sessions.updatedon as updatedon, " +
                "sessions.allprivacy as privacy, " +
                "sessions.temporary as temporary, " +
                "sessionfavorites.favorite as favorite " +
            "FROM sessions " +
            "JOIN applications ON sessions.appid = applications.appid " +
            "LEFT OUTER JOIN sessionfavorites ON " +
            "(sessions.sessionid = sessionfavorites.sessionid " +
            "AND sessionfavorites.username = ?) " +
            "WHERE (sessions.sessionid = ?)";
    */
	
    private static String SESSIONS_QUERY = 
            "SELECT sessions.sessionid as sessionid, " +
                "sessions.title as title, " + 
                "sessions.description as description, " +
                "sessions.appid as appid, " +
                "sessions.schedule as schedule, " +
                "sessions.creator as creator, " +
                "sessions.allprivacy as privacy, " +
                "sessionacls.acls as acls, " +
                "applications.title as apptitle, " +
                "applications.appurl as appurl, " + 
                "applications.thumbnailurl as thumbnailurl, " +
                "sessionfavorites.favorite as favorite, " +
                "sessionactivity.sessionid as active " +
            "FROM sessions " +
            "JOIN sessionacls ON sessions.sessionid = sessionacls.sessionid " +
            "JOIN applications ON sessions.appid = applications.appid " +
            "LEFT OUTER JOIN sessionactivity " +
                "ON sessions.sessionid = sessionactivity.sessionid " +
            "LEFT OUTER JOIN sessionfavorites ON " +
                "(sessions.sessionid = sessionfavorites.sessionid " +
                "AND sessionfavorites.username = ?) " +
            "WHERE (sessionacls.username = ? AND " +
                "sessionacls.acls & ? AND " +
                "(sessions.title LIKE ? OR " +
                "sessions.description LIKE ?) AND " +
                "sessionacls.sessionid NOT IN  " +
                "(SELECT sessionid as sessionid2 FROM sessionacls  " +
                "WHERE sessionacls.username = ?)) " + //%(filters)s " +
            "UNION " +
            "SELECT sessions.sessionid as sessionid,  " +
            "    sessions.title as title, " + 
            "    sessions.description as description, " + 
            "    sessions.appid as appid, " + 
            "    sessions.schedule as schedule, " +
            "    sessions.creator as creator, " +
            "    sessions.allprivacy as privacy, " +
            "    sessionacls.acls as acls, " +
            "    applications.title as apptitle, " +
            "    applications.appurl as appurl, " + 
            "    applications.thumbnailurl as thumbnailurl, " +
            "    sessionfavorites.favorite as favorite, " +
            "    sessionactivity.sessionid as active " +
            "FROM sessions " +
            "JOIN sessionacls ON sessions.sessionid = sessionacls.sessionid " +
            "JOIN applications ON sessions.appid = applications.appid " +
            "LEFT OUTER JOIN sessionactivity ON " +
                "sessions.sessionid = sessionactivity.sessionid " +
            "LEFT OUTER JOIN sessionfavorites ON " +
                "(sessions.sessionid = sessionfavorites.sessionid AND " +
                "sessionfavorites.username = ?) " +
            "WHERE (sessionacls.username = ? AND " +
                   "sessionacls.acls & ? AND " +
                   "(sessions.title LIKE ? OR " +
                   "sessions.description LIKE ?)) " + //%(filters)s " +
            "ORDER BY favorite DESC, active DESC " +
                      //"title COLLATE NOCASE ? " +
            "LIMIT ? OFFSET ?";
    
    private static String UNREG_APP_QUERY = 
    	"DELETE FROM applications WHERE appid = ?";
    
    private Connection conn = null;
    
    
    public ConferenceDB(Connection conn) {
        this.conn = conn;
    }
/*
    public List<Map<String, Object>> getApplicationsForUser(String username,
            int acls) {

        PreparedStatement stmt = null;
        ResultSet rs = null;
        JSONArray json = null;

        try {
            stmt = conn.prepareStatement(appQuery,
					ResultSet.TYPE_FORWARD_ONLY,
                    ResultSet.CONCUR_READ_ONLY);
            stmt.setString(1, ALL);
            stmt.setString(2, acls);
            stmt.setString(3, username);
            stmt.setString(4, username);
            stmt.setInt(5, acls);

            rs = stmt.executeQuery();
            json = this.resultSetToJSON(rs);
        }
        catch (Exception e) {
        }
        finally {
			if (rs != null) {
				try {
					rs.close();
				} catch (SQLException sqlEx) { } // ignore
				rs = null;
			}
			if (stmt != null) {
				try {
					stmt.close();
				} catch (SQLException sqlEx) { } // ignore
				stmt = null;
			}
		}

        return json;
    }
*/

    public int createSession(String username,
    		String appTitle,
    		String title,
    		String description) {
    	
    	int appid = this.getAppidFromTitle(appTitle);
    	if(appid == -1) 
    		return -1;
    	
    	ApplicationAcls appAcls = this.getApplicationAclsForUser(username, appid);
    	if(!appAcls.canHostApp())
    		throw new SecurityException("User " + username + " is not allowed to create sessions");
    	
    	PreparedStatement stmt = null;
        int sessionId = -1;
        
        try {
        	stmt = conn.prepareStatement(SESSION_CREATE,
					Statement.RETURN_GENERATED_KEYS);

            stmt.setInt(1, appid);
            stmt.setString(2, title);
            stmt.setString(3, description);
            stmt.setString(4, username);
            
            int res = stmt.executeUpdate();
            if(res == 1) {
            	ResultSet rs = stmt.getGeneratedKeys();
            	rs.next();
            	sessionId = rs.getInt(1);
            	stmt.close();
            	rs.close();
            	
            	stmt = conn.prepareStatement(SESSION_ACLS_CREATE,
					ResultSet.TYPE_FORWARD_ONLY,
					ResultSet.CONCUR_READ_ONLY);

            	stmt.setInt(1, sessionId);
            	stmt.setString(2, username);
            	stmt.setInt(3, SessionAcls.SESS_ALL);
            
            	res = stmt.executeUpdate();
            	if(res == -1) {
            		sessionId = -1;
            	}
            }
        }
        catch (Exception e) {
        	System.out.println(e.getMessage());
        }
        finally {
			if (stmt != null) {
				try {
					stmt.close();
				} catch (SQLException sqlEx) { } // ignore
				stmt = null;
			}
		}
        
    	return sessionId;
    }
    
    private void deleteSessionAcls(int sessionId) {
		String sql = "DELETE FROM sessionacls WHERE sessionid = ?";
		PreparedStatement stmt = null;
		try {
			stmt = conn.prepareStatement(sql,
					ResultSet.TYPE_FORWARD_ONLY, ResultSet.CONCUR_READ_ONLY);
			
			stmt.setInt(1, sessionId);
			stmt.executeUpdate();
		}
		catch(Exception e) { ; }
		finally {
			if (stmt != null) {
				try {
					stmt.close();
				} catch (SQLException sqlEx) {
				} // ignore
				stmt = null;
			}
		}	
	}
    
    private boolean ensureSessionManager(int sessionId, Map<String, Integer> aclsDict) {
    	for(Map.Entry<String, Integer> userAcl : aclsDict.entrySet()) {
    	
			int acl = (userAcl.getValue()).intValue();
			if((acl & SessionAcls.SESS_CHANGE_BIT) != 0)
				return true;
    	}
    	
		return false;
    }

    private int getAppidFromTitle(String title) {
    	
    	String sql = "SELECT appid FROM applications WHERE title = ?";
    	PreparedStatement stmt = null;
        ResultSet rs = null;
        int appid = -1;
        
        try {
        	 stmt = conn.prepareStatement(sql,
 					ResultSet.TYPE_FORWARD_ONLY,
                    ResultSet.CONCUR_READ_ONLY);
        
        	 stmt.setString(1, title); 
        	
        	 rs = stmt.executeQuery();
        	
        	 rs.next();
        	
        	 appid = rs.getInt(1);
        }
        catch (Exception e) {
        	System.out.println(e.getMessage());
        }
        finally {
			if (rs != null) {
				try {
					rs.close();
				} catch (SQLException sqlEx) { } // ignore
				rs = null;
			}
			if (stmt != null) {
				try {
					stmt.close();
				} catch (SQLException sqlEx) { } // ignore
				stmt = null;
			}
		}
        
    	return appid;
    }
    
    public Map<String, Object> getApplication(String username, String appTitle) {
    	String sql = "SELECT * FROM applications WHERE title = ?";
    	PreparedStatement stmt = null;
        ResultSet rs = null;
        Map<String, Object> ret = null;
        
        try {
            stmt = conn.prepareStatement(sql,
					ResultSet.TYPE_FORWARD_ONLY,
                    ResultSet.CONCUR_READ_ONLY);

            stmt.setString(1, appTitle);
            
            rs = stmt.executeQuery();
            ret = this.resultSetToMap(rs);
        }
        catch (Exception e) {
        }
        finally {
			if (rs != null) {
				try {
					rs.close();
				} catch (SQLException sqlEx) { } // ignore
				rs = null;
			}
			if (stmt != null) {
				try {
					stmt.close();
				} catch (SQLException sqlEx) { } // ignore
				stmt = null;
			}
		}
        
    	return ret;
    }
    
    private ApplicationAcls getApplicationAclsForUser(String username, int appid) {
    	PreparedStatement stmt = null;
        ResultSet rs = null;
        ApplicationAcls appAcls = null;
       
        try {
            stmt = conn.prepareStatement("SELECT acls FROM applicationacls " +
            		"WHERE (appid = ? AND username = ?)",
					ResultSet.TYPE_FORWARD_ONLY,
                    ResultSet.CONCUR_READ_ONLY);

            stmt.setInt(1, appid);
            stmt.setString(2, username);
            
            rs = stmt.executeQuery();
            int acls;
            if(rs.next()) {
            	acls = rs.getInt(1);
            	appAcls = new ApplicationAcls(acls);
            }
            else {
            	rs.close();
            	stmt.setString(2, "ALL");
            	rs = stmt.executeQuery();
            	if(rs.next()) {
            		acls = rs.getInt(1);
            		appAcls = new ApplicationAcls(acls);
            	}
            }  	
        }
        catch (Exception e) {
        }
        finally {
			if (rs != null) {
				try {
					rs.close();
				} catch (SQLException sqlEx) { } // ignore
				rs = null;
			}
			if (stmt != null) {
				try {
					stmt.close();
				} catch (SQLException sqlEx) { } // ignore
				stmt = null;
			}
		}
        
        //default to no permissions.
        if(appAcls == null) 
        	appAcls = new ApplicationAcls();
        
    	return appAcls;
    }
    
    public Map<String, Object> getSession(String username, 
    		String appTitle, 
    		String sessionId) {
    	
    	PreparedStatement stmt = null;
        ResultSet rs = null;
        Map<String, Object> ret = null;
        
        try {
            stmt = conn.prepareStatement(SESSIONS_QUERY,
					ResultSet.TYPE_FORWARD_ONLY,
                    ResultSet.CONCUR_READ_ONLY);

            stmt.setString(1, username);
            stmt.setString(2, sessionId);
            
            rs = stmt.executeQuery();
            ret = this.resultSetToMap(rs);
        }
        catch (Exception e) {
        }
        finally {
			if (rs != null) {
				try {
					rs.close();
				} catch (SQLException sqlEx) { } // ignore
				rs = null;
			}
			if (stmt != null) {
				try {
					stmt.close();
				} catch (SQLException sqlEx) { } // ignore
				stmt = null;
			}
		}
        
    	return ret;
    }
	
	public int getSessionAclsForUser(String username, String sessionid) {

		PreparedStatement stmt = null;
		ResultSet rs = null;
		int acls = -1;
		String sql = "SELECT acls " + "FROM sessionacls "
				+ "WHERE (sessionid = ? AND username = ?)";

		try {
			stmt = conn.prepareStatement(sql, ResultSet.TYPE_FORWARD_ONLY,
					ResultSet.CONCUR_READ_ONLY);

			stmt.setString(1, sessionid);
			stmt.setString(2, username);

			rs = stmt.executeQuery();
			if (rs.first()) {
				acls = rs.getInt(1);
			}
		} catch (Exception e) {
			System.out.println(e.getMessage());
		} finally {
			if (stmt != null) {
				try {
					stmt.close();
				} catch (SQLException sqlEx) {
				} // ignore
				stmt = null;
			}
		}

		return acls;
	}
    
    public List<Map<String, Object>> getSessionsForUser(String username, 
            int acls,
            String query,
            String orderBy,
            int offset,
            int numResults) {

        PreparedStatement stmt = null;
        ResultSet rs = null;
        List<Map<String, Object>> ret = null;
        int index = 1;

        if(query == null)
            query = "";
        
        query = "%"+query+"%";
        
        /*
        if(appTitle == null)
        	appTitle = "%";
        	*/

        try {
            stmt = conn.prepareStatement(SESSIONS_QUERY,
					ResultSet.TYPE_FORWARD_ONLY,
                    ResultSet.CONCUR_READ_ONLY);

            stmt.setString(index++, username);
            stmt.setString(index++, ALL);
            stmt.setInt(index++, acls);
            stmt.setString(index++, query);
            stmt.setString(index++, query);
            stmt.setString(index++, username);
            stmt.setString(index++, username);
            stmt.setString(index++, username);
            stmt.setInt(index++, acls);
            stmt.setString(index++, query);
            stmt.setString(index++, query);
            //stmt.setString(index++, orderBy);
            stmt.setInt(index++, numResults);
            stmt.setInt(index, offset);

            rs = stmt.executeQuery();
            ret = this.resultSetToList(rs);
        }
        catch (Exception e) {
        	e.printStackTrace();
        }
        finally {
			if (rs != null) {
				try {
					rs.close();
				} catch (SQLException sqlEx) { } // ignore
				rs = null;
			}
			if (stmt != null) {
				try {
					stmt.close();
				} catch (SQLException sqlEx) { } // ignore
				stmt = null;
			}
		}

        return ret;
    }
    
    public int registerApplication(String username, String title,
			String description, String appUrl, String thumbnailUrl)
			throws SecurityException {

		System.out.println("ConferenceDB::registerApplication");
		
		PreparedStatement stmt = null;
		int appid = -1;

		try {
			stmt = conn.prepareStatement(REG_APP_QUERY,
					Statement.RETURN_GENERATED_KEYS);

			stmt.setString(1, title);
			stmt.setString(2, description);
			stmt.setString(3, appUrl);
			stmt.setString(4, thumbnailUrl);

			int res = stmt.executeUpdate();
			System.out.println("1");
			if (res == 1) {
				System.out.println("2");
				ResultSet rs = stmt.getGeneratedKeys();
				rs.next();
				appid = rs.getInt(1);
				stmt.close();
				rs.close();

				System.out.println("3 appid = " + appid);
				stmt = conn.prepareStatement("INSERT INTO applicationacls "
						+ "(appid, username, acls)" + "VALUES (?, ?, ?)",
						Statement.RETURN_GENERATED_KEYS);

				stmt.setInt(1, appid);
				stmt.setString(2, username);
				stmt.setInt(3, ApplicationAcls.APP_ALL);

			
				res = stmt.executeUpdate();
				if (res != 1) {
					System.out.println("bad");
					conn.rollback();
					appid = -1;
				}
				
			} else {
				conn.rollback();
			}
		} catch (Exception e) {
			System.out.println("registerApplicationError");
			System.out.println(e.toString());
		} finally {
			if (stmt != null) {
				try {
					stmt.close();
				} catch (SQLException sqlEx) {
				} // ignore
				stmt = null;
			}
		}

		return appid;
	}
    
    private List<Map<String, Object>> resultSetToList(ResultSet rs) {
        ArrayList<Map<String, Object>> jsonArr = new ArrayList<Map<String, Object>>();

        try {
            ResultSetMetaData m = rs.getMetaData();
            Map<String, Object> row = null;
            int numColumns = m.getColumnCount();

			while (rs.next()) {
				row = new HashMap<String, Object>();
				
				for(int i=1; i<=numColumns; i++) {
					row.put(m.getColumnLabel(i), rs.getObject(i));
				}
				
				jsonArr.add(row);
			}
		}
        catch(Exception e) {
            e.printStackTrace();
        }

        return jsonArr;
    }
   
    private Map<String, Object> resultSetToMap(ResultSet rs) {
        HashMap<String, Object> row = null;
        try {
            ResultSetMetaData m = rs.getMetaData();
            int numColumns = m.getColumnCount();

			if(rs.next()) {
				row = new HashMap<String, Object>();
				
				for(int i=1; i<=numColumns; i++) {
					row.put(m.getColumnLabel(i), rs.getObject(i));
				}
			}
		}
        catch(Exception e) {
            e.printStackTrace();
        }

        return row;
    }

    public boolean setSessionAcls(int sessionId, Map<String, Integer> aclsDict) {
    	
		PreparedStatement stmt = null;
		
		if(!this.ensureSessionManager(sessionId, aclsDict)) {
			return false;
		}
		
		this.deleteSessionAcls(sessionId);
		
		for(Map.Entry<String, Integer> userAcl : aclsDict.entrySet()) {
			
			String username = userAcl.getKey();
			int acl = (userAcl.getValue()).intValue();
			
			try {
				stmt = conn.prepareStatement(SESSION_ACLS_CREATE,
						ResultSet.TYPE_FORWARD_ONLY, ResultSet.CONCUR_READ_ONLY);
				
				stmt.setInt(1, sessionId);
				stmt.setString(2, username);
				stmt.setInt(3, acl);

				stmt.executeUpdate();
			}
			catch(Exception e) { ; }
			finally {
				if (stmt != null) {
					try {
						stmt.close();
					} catch (SQLException sqlEx) {
					} // ignore
					stmt = null;
				}
			}
		}
		
		return true;
	}
    
    public boolean unregisterApplication(int appid) {
    		
    	 System.out.println("ConferenceDB::unregisterApplication");
    	 
    	 PreparedStatement stmt = null;
    	 boolean ret = true;
    	
         try {
        	 stmt = conn.prepareStatement(UNREG_APP_QUERY,
 					Statement.RETURN_GENERATED_KEYS);
        	 stmt.setInt(1, appid);
     
        	 int res = stmt.executeUpdate();
        	 if(res != 1) 
        		 ret = false;
         }
         catch (Exception e) { 
        	 System.out.println("unregisterApplicationError");
        	 System.out.println(e.toString()); 
         }
         finally {
 			if (stmt != null) {
 				try {
 					stmt.close();
 				} catch (SQLException sqlEx) { } // ignore
 				stmt = null;
 			}
 		}
      
    	return ret;
    }
    
    public boolean unregisterApplication(String title) {
    	int appid = this.getAppidFromTitle(title);
    	return this.unregisterApplication(appid);
    }
}
