/**
 * Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
 */
package org.coweb.servlet;

import java.io.IOException;

import java.util.Map;
import java.util.HashMap;

import javax.servlet.ServletContext;
import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.cometd.bayeux.server.BayeuxServer;
import org.cometd.server.ext.AcknowledgedMessagesExtension;
import org.coweb.CowebExtension;
import org.coweb.SessionHandler;
import org.coweb.SessionManager;
import org.coweb.CowebSecurityPolicy;

//import org.apache.wink.json4j.JSONObject;
import org.eclipse.jetty.util.ajax.JSON;

public class AdminServlet extends HttpServlet {
	
	
	/**
	 * 
	 */
	private static final long serialVersionUID = 1L;
	
	public static final String SESSMGR_ATTRIBUTE = "session.attribute";

	@Override
	public void init() throws ServletException {
		super.init();
		
		ServletContext servletContext = this.getServletContext();
		
		BayeuxServer bayeux = 
            (BayeuxServer)servletContext.getAttribute(BayeuxServer.ATTRIBUTE);
	    bayeux.addExtension(new AcknowledgedMessagesExtension());

        ServletConfig config = this.getServletConfig();
        String delegateClass = config.getInitParameter("delegateClass");
        String securityClass = config.getInitParameter("securityClass");

        CowebSecurityPolicy securityPolicy;
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

	    bayeux.addExtension(new CowebExtension());
	    bayeux.setSecurityPolicy(securityPolicy);
	    
	    SessionManager manager = SessionManager.newInstance(servletContext, 
                bayeux,
                delegateClass);

		servletContext.setAttribute(SESSMGR_ATTRIBUTE, manager);
	}
	
	public SessionManager getSessionManager() {
		return (SessionManager)getServletContext().getAttribute(SESSMGR_ATTRIBUTE);
	}
	
	@Override
	public void doPost(HttpServletRequest req, HttpServletResponse resp)
	throws ServletException, IOException {
		
		//System.out.println("AdminSerlvet::doPost");
		resp.setContentType("appliation/json");

		String userName = req.getRemoteUser();
        if(userName == null)
            userName = "anonymous";


		String confKey = null;
		boolean collab = false;
		
		try {
			Map<String, Object> jsonObj = 
                (Map<String, Object>)JSON.parse(req.getReader());
			confKey = (String)jsonObj.get("key");
			if(confKey == null) {
				resp.sendError(HttpServletResponse.SC_BAD_REQUEST, "No confkey given");
				return;
			}
			
			if(jsonObj.containsKey("collab")) {
				if(((Boolean)jsonObj.get("collab")).booleanValue() == true) {
					collab = true;
				}
			}

            /*
            if(!this.accessPolicy.canAdminRequest(userName,confKey,collab))
                resp.sendError(HttpServletResponse.SC_FORBIDDEN,
                        "User " + userName + " not allowed");
                        */
			
		}
		catch(Exception e) {
			resp.sendError(HttpServletResponse.SC_BAD_REQUEST, "bad json");
			return;
		}
		
		
		SessionManager manager = this.getSessionManager();
		SessionHandler handler = manager.getSessionHandler(confKey, collab);
		if(handler == null) {
			//System.out.println("AdminServlet creating new session");
			handler = manager.createSession(confKey, collab);
		}
			
		String sessionId = handler.getSessionId();
		
		String base = this.getServletContext().getContextPath();

		HashMap<String, Object> jsonResp = new HashMap<String, Object>();
		
		try {
			jsonResp.put("sessionurl",base+"/cometd");
			jsonResp.put("sessionid", sessionId);
			jsonResp.put("username", userName);
			jsonResp.put("key", confKey);
			jsonResp.put("collab", new Boolean(collab));
			jsonResp.put("info", new HashMap());

            String jsonStr = JSON.toString(jsonResp);
            java.io.PrintWriter writer = resp.getWriter();
            writer.print(jsonStr);
            writer.flush();
		}
		catch(Exception e) { ; }

        /*
		JSONObject jsonResp = new JSONObject();
		
		try {
			jsonResp.put("sessionurl",base+"/cometd");
			jsonResp.put("sessionid", sessionId);
			jsonResp.put("username", userName);
			jsonResp.put("key", confKey);
			jsonResp.put("collab", new Boolean(collab));
			jsonResp.put("info", new JSONObject());

			jsonResp.write(resp.getWriter());
		}
		catch(Exception e) { ; }
        */
	}
}
