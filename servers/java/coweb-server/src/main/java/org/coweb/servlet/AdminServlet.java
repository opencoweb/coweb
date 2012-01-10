/**
 * Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
 * Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
 */
package org.coweb.servlet;

import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;


import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;
import java.util.Collection;

import java.util.logging.Logger;

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
	private static final Logger log = Logger.getLogger(AdminServlet.class.getName());
	
	public static final String SESSMGR_ATTRIBUTE = "session.attribute";

    private SessionManager sessionManager = null;
    private CowebSecurityPolicy securityPolicy = null;
	
    /**
     * Loads the coweb config file and creates the security manager and
     * session manager.  The session manager is registered to listen
     * for all bayeux traffic.
     */
	@Override
	public void init() throws ServletException {
		super.init();
		
		log.info("servlet init");
		ServletContext servletContext = this.getServletContext();

        //get the bayeux server and register the bayeux ack extension.
		BayeuxServer bayeux = 
            (BayeuxServer)servletContext.getAttribute(BayeuxServer.ATTRIBUTE);
	    bayeux.addExtension(new AcknowledgedMessagesExtension());

	    //parse the coweb configuration file for this application.
        ServletConfig config = this.getServletConfig();
        Map<String, Object> cowebConfig = null;
        try {
			cowebConfig = this.getCowebConfigOptions(config);
		} catch (Exception e1) {
			e1.printStackTrace();
			cowebConfig = new HashMap<String, Object>();
		}
        
        log.info("cowebConfig = " + cowebConfig.toString());

        //setup any debug options for capturing incoming and outgoing 
        //bayeux traffic.
		String captureIncoming = (String)cowebConfig.get("captureIncoming");
		String captureOutgoing = (String)cowebConfig.get("captureOutgoing");
		if(captureIncoming != null || captureOutgoing != null) {
			try {
				CowebExtension cowebExtension = new CowebExtension(captureIncoming, captureOutgoing);
				bayeux.addExtension(cowebExtension);
			}
			catch(Exception e) {
				log.info(e.getMessage());
			}		
		}

		
        //Create the security policy.  Default to CowebSecurityPolicy.
		//Get the SecurityPolicy for this application
        String securityClass = (String)cowebConfig.get("securityClass");
        if(securityClass == null)
            securityPolicy = new CowebSecurityPolicy();
        else {
            try {
                Class<? extends CowebSecurityPolicy> clazz = Class.forName(securityClass).asSubclass(CowebSecurityPolicy.class);
                securityPolicy = (CowebSecurityPolicy)clazz.newInstance();
            }
            catch(Exception e) {
                securityPolicy = new CowebSecurityPolicy();
            }
        }

        //set the coweb security policty
	    bayeux.setSecurityPolicy(securityPolicy);
	  
	    //create the SessionManager instance.  The SessionManager also listens to all bayeux
	    //traffic.
	    this.sessionManager = SessionManager.newInstance(cowebConfig, bayeux);
	}
	
	@Override
	public void doGet(HttpServletRequest req, HttpServletResponse resp) 
	throws ServletException, IOException {
	
		//System.out.println("AdminServlet::gotGet ***********");
		//System.out.println(req.getRequestURL());
		log.info("received admin rest call");
		if(req.getRequestURL().indexOf("disconnect") != -1) {
			log.info("received disconnect rest call");
			this._handleDisconnect(req, resp);
			return;
		}
		
		if(req.getRequestURL().indexOf("sessions") != -1) {
			log.info("received sessions rest call");
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
	
	/**
	 * Clients will send a post to the admin servlet to join a session.  If a session
	 * does not already exist, one will be created.  See the protocol documentation
	 * for the correct format of the prep request.
	 */
	@SuppressWarnings("unchecked")
	@Override
	public void doPost(HttpServletRequest req, HttpServletResponse resp)
	throws ServletException, IOException {
		
		log.info("received prep request 0.7");
		resp.setContentType("appliation/json");

		String username = req.getRemoteUser();
        if(username == null)
            username = "anonymous";

		Map<String, Object> jsonObj = null;
		
		try {
            jsonObj = (Map<String, Object>)JSON.parse(req.getReader());
		}
		catch(Exception e) {
			log.severe("error processing prep request: " + e.getMessage());
			resp.sendError(HttpServletResponse.SC_BAD_REQUEST, "bad json");
			return;
		}
		
		//get the requesting url.  This param is optional.
		String requestUrl = (jsonObj.containsKey("requesturl")) ? (String)jsonObj.get("requesturl") : "";
		//if the conference key is null, we will auto generate one.
		String confKey = (String)jsonObj.get("key");
		if(confKey == null) {
			log.info("confKey is null generating one...");
			confKey = SessionHandler.hashURI(Long.toString(System.currentTimeMillis()));
			requestUrl += "#/cowebkey/" + confKey;
		}
		log.info("confKey = " + confKey);
		log.info("request url = " + requestUrl);

		
		//TODO need to call the security policy to see if this user is 
        //allowed to send prep requests and allow any further processing
        //as an extension point.
		if(!securityPolicy.canAdminRequest(username, confKey, true))
			resp.sendError(HttpServletResponse.SC_FORBIDDEN, 
					"user " + username + "not allowed");
		
		//grab the session name.  optional param.
		String sessionName = null;
		if(jsonObj.containsKey("sessionName")) {
			sessionName = (String)jsonObj.get("sessionName");
		}
		
		//see if we have a session for this key already.  If not create one.
		SessionHandler handler = this.sessionManager.getSessionHandler(confKey);
		if(handler == null) {
			handler = this.sessionManager.createSession(confKey);
			handler.setSessionName(sessionName);
			handler.setRequestUrl(requestUrl);
		}
		
				
		String sessionId = handler.getSessionId();
		
		//get our base url, to tell clients where the bayeux servlet is.
		String base = this.getServletContext().getContextPath();
		
		HashMap<String, Object> jsonResp = new HashMap<String, Object>();
	
        //Send the prep response back to the client.    
		try {
			jsonResp.put("sessionurl",base+"/cometd");
			jsonResp.put("sessionid", sessionId);
			jsonResp.put("username", username);
			jsonResp.put("key", confKey);
			jsonResp.put("collab", new Boolean(true));
			jsonResp.put("info", new HashMap<String, Object>());
			

            String jsonStr = JSON.toString(jsonResp);
            java.io.PrintWriter writer = resp.getWriter();
            writer.print(jsonStr);
            writer.flush();
		}
		catch(Exception e) { 
			log.severe("error creating prep response: " + e.getMessage()); 
		}
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
	
	private Map<String, Object> getCowebConfigOptions(ServletConfig config) 
			throws Exception {
		String configURI = config.getInitParameter("ConfigURI");
		if(configURI == null) {
			return this.getConfigOptionsFromInitParams(config);
		}
		
		return this.getConfigOptionsFromFile(configURI, config);
	}
	
	/**
	 * We need to phase out the init params and move to json config file.
	 * This is here for backward compatability.
	 * @param config
	 * @return
	 */
	private Map<String, Object> getConfigOptionsFromInitParams(ServletConfig config) {
		HashMap<String, Object> ops = new HashMap<String, Object>();
		
        String securityClass = config.getInitParameter("securityClass");
        if(securityClass != null)
        	ops.put("securityClass", securityClass);
        
        //Get the UpdaterTypeMatcher for this application
        String updaterTypeMatcherClass = config.getInitParameter("updaterTypeMatcherClass");
        if(updaterTypeMatcherClass != null)
        	ops.put("updaterTypeMatcherClass", updaterTypeMatcherClass);

		String captureIncoming = config.getInitParameter("captureIncoming");
		if(captureIncoming != null) 
			ops.put("captureIncoming", captureIncoming);
		
		String captureOutgoing = config.getInitParameter("captureOutgoing");
		if(captureOutgoing != null)
			ops.put("captureOutgoing", captureOutgoing);
		
		return ops;
	}
	
	@SuppressWarnings("unchecked")
	private Map<String, Object> getConfigOptionsFromFile(String filePath, ServletConfig servletConfig) 
	{
		
		InputStream in = servletConfig.getServletContext().getResourceAsStream(filePath);

		log.info("loading configuration file " + filePath);
		try {
			return (Map<String, Object>) JSON.parse(new InputStreamReader(in));
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		
		return null;
	}
}
