/**
 * Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
 * Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved. 
 */
package org.coweb.bots.transport;

import java.io.IOException;
import java.util.Map;
import java.util.Properties;

import org.cometd.bayeux.Message;
import org.cometd.bayeux.server.BayeuxServer;
import org.cometd.bayeux.server.ServerSession;
import org.coweb.SessionManager;


public abstract class Transport {
	
	protected Properties botConfig = null;
	
	protected String serviceName = null;
	protected String sessionId = null;
	protected BayeuxServer bayeuxServer = null;
	
	protected ServerSession server = null;
	
	protected Transport() {
		SessionManager manager = SessionManager.getInstance();
        this.bayeuxServer = manager.getBayeux();
		this.server = manager.getServerSession();
	}
	
	public Transport(Properties botConfig, String sessionId) {
		this.botConfig = botConfig;
		this.sessionId = sessionId;	
	}
	
	public void setBotConfig(Properties botConfig) {
		this.botConfig = botConfig;
		this.serviceName = botConfig.getProperty("service");
	}
	
	public void setSessionId(String sessionId) {
		this.sessionId = sessionId;
	}
	
	public void setBayeuxServer(BayeuxServer bayeuxServer) {
		this.bayeuxServer = bayeuxServer;
	}
	
	public abstract void init();
	
	public abstract boolean subscribeUser(ServerSession client,
			Message message,
			boolean pub) throws IOException;
	
	public abstract boolean unsubscribeUser(ServerSession client,
			Message message,
			boolean pub) throws IOException;
	
	
	public abstract boolean userRequest(ServerSession client,
			Message message) throws IOException;

	public abstract boolean syncEvent(ServerSession client,
			Message message) throws IOException;
	
	public abstract void shutdown();
}
