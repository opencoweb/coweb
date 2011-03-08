/**
 * Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
 * Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
 */
package org.coweb;

import java.io.IOException;
import java.io.InputStream;
import java.util.Map;
import java.util.HashMap;
import java.util.Properties;
import java.util.StringTokenizer;

import javax.servlet.ServletContext;

import org.cometd.server.AbstractService;
import org.cometd.bayeux.Message;
import org.cometd.bayeux.server.BayeuxServer;
import org.cometd.bayeux.server.ConfigurableServerChannel;
import org.cometd.bayeux.server.ServerChannel;
import org.cometd.bayeux.server.ServerMessage.Mutable;
import org.cometd.bayeux.server.ServerSession;


//import javax.servlet.http.HttpServletRequest;

public class SessionManager extends AbstractService implements BayeuxServer.SessionListener
{
	private Map<String, SessionHandler> sessions = new HashMap<String, SessionHandler>();
	
	private static SessionManager singleton = null;
	private ServletContext servletContext = null;
    private Class delegateClass = null;
	
    private SessionManager(BayeuxServer bayeux, 
            ServletContext context,
            String delegate)
    {
        super(bayeux, "session");
        this.servletContext = context;
        //this.addService("/meta/handshake", "handleHandshake");
 
        try {
            this.delegateClass = Class.forName(delegate);
        }
        catch(Exception e) {
            //TODO Better error handling.
            e.printStackTrace();
        }

        this.addService("/meta/subscribe", "handleSubscribed");
        this.addService("/meta/unsubscribe", "handleUnsubscribed");
        this.addService("/session/roster/*", "handleMessage");
		//this.addService("/session/sync", "handleMessage");
		this.addService("/service/session/join/*", "handleMessage");
		this.addService("/service/session/updater", "handleMessage");
		this.addService("/service/bot/**", "handleMessage");
		this.addService("/bot/**", "handleMessage");

		ServerChannel.Initializer initializer = new ServerChannel.Initializer()
        {
            @Override
            public void configureChannel(ConfigurableServerChannel channel)
            {
                channel.setPersistent(true);
                channel.setLazy(false);
            }
        };
        
        bayeux.createIfAbsent("/session/sync", initializer);
			
        bayeux.addListener(this);
    }
    
    public static SessionManager newInstance(ServletContext servletContext,
            BayeuxServer bayeux,
            String delegate) {

        if(singleton != null)
            return singleton;

        if(servletContext == null)
            return null;

        if(delegate == null)
            delegate = "org.coweb.CollabDelegate";

        singleton = new SessionManager(bayeux, servletContext, delegate);
        singleton.setSeeOwnPublishes(false);

    	return singleton;
    }

    public static SessionManager getInstance() {
        return singleton;
    }
    
    public Properties loadPropertyFile(String name) {
    	
    	InputStream in = this.servletContext.getResourceAsStream(name);
        //System.out.println("loadPropertyFile " + name);
        //System.out.println("stream = " + in);
    	Properties p = new Properties();
    	try {
			p.load(in);
		} catch (IOException e) {
			p = null;
		}
		
		return p;
    }
    
    /**
     * Parses the sessionId from the channel.
     * 
     * @param channelName
     * @return sessionId
     */
    public static String getSessionIdFromChannel(String channelName) {
    	StringTokenizer st = new StringTokenizer(channelName, "/", false);
    	
    	String sessionId = st.nextToken();
    	if(sessionId.equals("service")) {
    		sessionId = st.nextToken();
    	}
    	
    	return sessionId;
    }
    
    public static String getSessionIdFromMessage(Message message) {
    	Map<String,Object> ext = message.getExt();
    	if(ext == null)
    		return null;
    	
    	Map<String,Object> cowebExt = (Map<String,Object>)ext.get("coweb");
    	if(cowebExt == null)
    		return null;
    	
    	String sessionId = (String)cowebExt.get("sessionid");
    	return sessionId;
    }
    
    public SessionHandler getSessionHandler(Message message) {
    	
    	String sessionId = getSessionIdFromMessage(message);
        //System.out.println("sessionId = " + sessionId);

    	
    	return this.getSessionHandler(sessionId);
    }
    
    public SessionHandler getSessionHandler(ServerSession client) {
    	
    	String sessionId = (String)client.getAttribute("sessionid");
    	
    	return this.getSessionHandler(sessionId);
    }
    
    /**
     * 
     * @param confkey The conference key
     * @param collab True if this is a collaborative session
     * @return SessionHandler
     */
    public SessionHandler getSessionHandler(String confkey, boolean collab) {
		
    	String key = confkey + ":" + collab;
    	return this.sessions.get(key);
    }
    
    public SessionHandler getSessionHandler(String sessionId) {
    	if(this.sessions.isEmpty()) {
    		return null;
    	}
    	
    	for(SessionHandler h : this.sessions.values()) {
    		if(h.getSessionId().equals(sessionId)) {
    			return h;
    		}
    	}
    	
    	return null;
    }
    
    public void handleSubscribed(ServerSession serverSession, Message message) {
    	//System.out.println("SessionManager::handleSubscribed");
    	//System.out.println(message);
    	
    	SessionHandler handler = this.getSessionHandler(message);
        //System.out.println("handler = " + handler);
    	
    	if(handler != null)
    		handler.onSubscribe(serverSession, message);
    }
    
    public void handleUnsubscribed(ServerSession serverSession, Message message) {
    	//System.out.println("SessionManager::unsubscribed");
    	//System.out.println(message.getChannel());
    	//SessionHandler handler = this.getSessionHandler((String)message.get(Message.SUBSCRIPTION_FIELD));
			
    	SessionHandler handler = this.getSessionHandler(message);
    	if(handler != null) {
    		handler.onUnsubscribe(serverSession, message);
    	}
    }
     
    public void handleMessage(ServerSession remote, Message message) {
    	System.out.println("SessionManager::handleMessage");
    	//System.out.println(message);
    	String sessionId = (String)remote.getAttribute("sessionid");
    	SessionHandler handler = null;
    	if(sessionId == null)
    		handler = this.getSessionHandler(message);
    	else
    		handler = this.getSessionHandler(sessionId);
    	
    	//System.out.println(handler);
    	if(handler != null) {
    		handler.onPublish(remote, message);
    	}
    	else {
    		System.out.println("could not find handler");
    	}
    }
    
   
    /**
     * Creates a new SessionHandler for the conference.
     * 
     * @param confkey
     * @param collab
     * @return
     */
    public SessionHandler createSession(String confkey, boolean collab) {
    	//System.out.println("SessionManager::createSession");
    	//System.out.println("collab = " + collab);
    	SessionHandler handler = this.getSessionHandler(confkey, collab);
    
    	if(handler == null) {
    		
            SessionHandlerDelegate delegate;
            try {
                delegate = 
                    (SessionHandlerDelegate)this.delegateClass.newInstance();
            }
            catch(Exception e) {
                delegate = new DefaultDelegate();
            }

    		handler = new SessionHandler(confkey, collab, delegate);
    		this.sessions.put(confkey + ":" + collab, handler);
    	}
    	
    	return handler;
    }
    
    public void removeSessionHandler(SessionHandler handler) {
    	System.out.println("removeSessionHandler");
    	this.removeSessionHandler(handler.getConfKey(), handler.isCollab());
    }
    
    public void removeSessionHandler(String confkey, boolean collab) {
    	SessionHandler handler = this.sessions.remove(confkey+":" + collab);
    	
    	handler = null;
    }

	
	@Override
	public void sessionAdded(ServerSession client) {
		//System.out.println("session added " + client);
		return;
		// TODO Auto-generated method stub
		
	}

	@Override
	public void sessionRemoved(ServerSession client, boolean timeout) {
		System.out.println("SessionManager::sessionRemoved");
		String sessionId = (String)client.getAttribute("sessionid");
		SessionHandler handler = this.getSessionHandler(sessionId);
	
        if(handler == null) 
            return;

		handler.onPurgingClient(client);
	}
	
}
