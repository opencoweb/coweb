/**
 * Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
 * Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
 */
package org.coweb.servlet;

import java.io.IOException;
import java.io.PrintWriter;

import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;
import java.util.Collection;

import javax.servlet.ServletContext;
import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.cometd.bayeux.server.BayeuxServer;
import org.cometd.server.ext.AcknowledgedMessagesExtension;
import org.coweb.SessionHandler;
import org.coweb.SessionManager;
import org.coweb.CowebSecurityPolicy;
import org.coweb.CowebExtension;

import org.eclipse.jetty.util.ajax.JSON;

/**
 * The servlet that handles session prepare requests.  This servlet will
 * will reply with the session info for the client.  If a session does not
 * already exist it will be created. The servlet must be initialized after
 * the cometd servlet.
 *
 */
public class AdminServlet extends HttpServlet {
	
	private static final long serialVersionUID = 1L;
	
	public static final String SESSMGR_ATTRIBUTE = "session.attribute";

    private SessionManager sessionManager = null;
    private CowebSecurityPolicy securityPolicy = null;
	private boolean sessionIdInChannel = false;
	
	private boolean generateRandomCowebkey = false;

	@Override
	public void init() throws ServletException {
		super.init();
		
		ServletContext servletContext = this.getServletContext();

        //get the bayeux server and register the bayeux ack extension.
		BayeuxServer bayeux = 
            (BayeuxServer)servletContext.getAttribute(BayeuxServer.ATTRIBUTE);
	    bayeux.addExtension(new AcknowledgedMessagesExtension());

        ServletConfig config = this.getServletConfig();

        //Get the SessionDelegateClass for this application
        String delegateClass = config.getInitParameter("delegateClass");
        //Get the SecurityPolicy for this application
        String securityClass = config.getInitParameter("securityClass");
        //Get the UpdaterTypeMatcher for this application
        String updaterTypeMatcherClass = config.getInitParameter("updaterTypeMatcherClass");

		String sessionIdInChannelParam = config.getInitParameter("sessionIdInChannel");
		if(sessionIdInChannelParam != null && sessionIdInChannelParam.equals("1")) {
			this.sessionIdInChannel = true;
		}
		
		String generateRandomCowebkeyParam = config.getInitParameter("generateRandomCowebkey");
		if(generateRandomCowebkeyParam != null && generateRandomCowebkeyParam.equals("1")) {
			this.generateRandomCowebkey = true;
		}

        //Create the security policy.  Default to CowebSecurityPolicy.
        if(securityClass == null)
            securityPolicy = new CowebSecurityPolicy();
        else {
            try {
                Class clazz = Class.forName(securityClass);
                securityPolicy = (CowebSecurityPolicy)clazz.newInstance();
            }
            catch(Exception e) {
                securityPolicy = new CowebSecurityPolicy();
            }
        }

        //set the coweb security policty
	    bayeux.setSecurityPolicy(securityPolicy);
	  
        //System.out.println("delegateClass = " + delegateClass); 
        //create the session manager. 
	    this.sessionManager = SessionManager.newInstance(servletContext, 
                bayeux,
                delegateClass,
                updaterTypeMatcherClass);
	}
	
	@Override
	public void doGet(HttpServletRequest req, HttpServletResponse resp) 
	throws ServletException, IOException {
	
		//System.out.println("AdminServlet::gotGet ***********");
		//System.out.println(req.getRequestURL());
		if(req.getRequestURL().indexOf("disconnect") != -1) {
			this._handleDisconnect(req, resp);
			return;
		}
		
		if(req.getRequestURL().indexOf("sessions") != -1) {
			ArrayList<Object> sessionsList = new ArrayList<Object>();
			HashMap<String, Object> ret = new HashMap<String, Object>();
			
			Collection<SessionHandler> sessions = this.sessionManager.getAllSessions();
			int length = 0;
			if(sessions != null) {
				length = sessions.size();
				for(SessionHandler sessionHandler : sessions) {
					HashMap<String, Object> sessionJson = new HashMap<String, Object>();
					sessionJson.put("requestUrl", sessionHandler.getRequestUrl());
					sessionJson.put("confKey", sessionHandler.getConfKey());
					sessionJson.put("sessionName", sessionHandler.getSessionName());
					sessionsList.add(sessionJson);
				}	
			}
			
			ret.put("sessions", sessionsList);
			ret.put("length", new Integer(length));
			String jsonStr = JSON.toString(ret);
			
			java.io.PrintWriter writer = resp.getWriter();
			writer.print(jsonStr);
            writer.flush();
			return;
		}
	}
	
	@Override
	public void doPost(HttpServletRequest req, HttpServletResponse resp)
	throws ServletException, IOException {
		
		
		resp.setContentType("appliation/json");

		String username = req.getRemoteUser();
        if(username == null)
            username = "anonymous";

		String confKey = null;
		String originalKey = null;
		boolean collab = false;
		boolean cacheState = false;
		boolean generatedCowebkey = false;
		String sessionName = null;
		Map<String, Object> jsonObj = null;
		
		try {
            jsonObj = (Map<String, Object>)JSON.parse(req.getReader());
			System.out.println(jsonObj);
			confKey = (String)jsonObj.get("key");
			if(confKey == null) {
                String errMsg = "No confkey in prep request.";
				resp.sendError(HttpServletResponse.SC_BAD_REQUEST, errMsg);
				return;
			}
			
			if(jsonObj.containsKey("collab")) {
				if(((Boolean)jsonObj.get("collab")).booleanValue() == true) {
					collab = true;
				}
			}

			if(jsonObj.containsKey("cacheState")) {
				if(((Boolean)jsonObj.get("cacheState")).booleanValue() == true) {
					cacheState = true;
				}
			}

            //TODO need to call the security policy to see if this user is 
            //allowed to send prep requests and allow any further processing
            //as an extension point.
			if(!securityPolicy.canAdminRequest(username, confKey, collab))
				resp.sendError(HttpServletResponse.SC_FORBIDDEN, 
						"user " + username + "not allowed");
			
			originalKey = confKey;
			
			if(this.generateRandomCowebkey &&
			   jsonObj.containsKey("defaultKey") &&
			   ((Boolean)jsonObj.get("defaultKey")).booleanValue() == true)
		 	{
				confKey = this.generateRandomCowebkey(confKey);
				//System.out.println("Generating coweb key " + confKey);
				generatedCowebkey = true;
			}
			
			if(jsonObj.containsKey("sessionName")) {
				sessionName = (String)jsonObj.get("sessionName");
			}
			
		}
		catch(Exception e) {
			resp.sendError(HttpServletResponse.SC_BAD_REQUEST, "bad json");
			return;
		}
		
		SessionHandler handler = 
            this.sessionManager.getSessionHandler(confKey, collab, cacheState);
		if(handler == null) {
			handler = this.sessionManager.createSession(confKey, collab, cacheState, this.sessionIdInChannel);
			if(sessionName != null) {
				handler.setSessionName(sessionName);
			}
		}
		
		String requestUrl = (jsonObj.containsKey("requesturl")) ? (String)jsonObj.get("requesturl") : "";
		requestUrl += (generatedCowebkey) ? "#/cowebkey/" + confKey : "";
		handler.setRequestUrl(requestUrl);
				
		String sessionId = handler.getSessionId();
		String base = this.getServletContext().getContextPath();
		HashMap<String, Object> jsonResp = new HashMap<String, Object>();
	
        //Send the prep response back to the client.    
		try {
			jsonResp.put("sessionurl",base+"/cometd");
			jsonResp.put("sessionid", sessionId);
			jsonResp.put("username", username);
			jsonResp.put("key", originalKey);
			jsonResp.put("collab", new Boolean(collab));
			jsonResp.put("sessionIdInChannel", new Boolean(this.sessionIdInChannel));
			jsonResp.put("info", new HashMap());
			if(generatedCowebkey) {
				jsonResp.put("generatedcowebkey", confKey);
			}

            String jsonStr = JSON.toString(jsonResp);
            java.io.PrintWriter writer = resp.getWriter();
            writer.print(jsonStr);
            writer.flush();
		}
		catch(Exception e) { ; }
	}
	
	private String generateRandomCowebkey(String key) {
		return SessionHandler.hashURI(key);
	}
	
	private void _handleDisconnect(HttpServletRequest req, HttpServletResponse resp) {
		//System.out.println("AdminServlet::_handleDisconnect ***********");
		String path = req.getPathInfo();
		//System.out.println("path info = " + path);
		if(path == null)
			return;
		
		String[] paths = path.split("/");
		if(paths == null || paths.length != 4)
			return;
		
		String sessionId = paths[2];
		String siteId = paths[3];
		
		this.sessionManager.disconnectClient(sessionId, siteId);
	}
}
