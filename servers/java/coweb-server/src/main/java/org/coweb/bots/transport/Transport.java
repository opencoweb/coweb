/**
 * Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
 * Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved. 
 */
package org.coweb.bots.transport;

import java.io.IOException;
import java.util.Map;

import org.cometd.bayeux.Message;
import org.cometd.bayeux.server.BayeuxServer;
import org.cometd.bayeux.server.ServerSession;
import org.cometd.bayeux.server.ServerChannel;
import org.cometd.bayeux.server.ConfigurableServerChannel;
import org.coweb.SessionManager;

public abstract class Transport {

	protected Map<String, Object> botConfig = null;

	protected String serviceName = null;
	protected String sessionId = null;
	protected BayeuxServer bayeuxServer = null;

	protected ServerSession server = null;

	protected Transport() {
		SessionManager manager = SessionManager.getInstance();
		this.bayeuxServer = manager.getBayeux();
		this.server = manager.getServerSession();
	}

	public Transport(Map<String, Object> botConfig, String sessionId) {
		this.botConfig = botConfig;
		this.sessionId = sessionId;
	}

	public void setBotConfig(Map<String, Object> botConfig) {
		this.botConfig = botConfig;
		this.serviceName = (String) botConfig.get("service");
	}

	public String getServiceName() {
		return this.serviceName;
	}

	public ServerSession getServer() {
		return this.server;
	}

	public void setSessionId(String sessionId) {
		this.sessionId = sessionId;
	}

	public void setBayeuxServer(BayeuxServer bayeuxServer) {
		this.bayeuxServer = bayeuxServer;
	}

	public abstract void init();

	public abstract boolean subscribeUser(ServerSession client,
			boolean pub) throws IOException;

	public abstract boolean unsubscribeUser(ServerSession client,
			boolean pub) throws IOException;

	public abstract boolean userRequest(ServerSession client, Message message)
			throws IOException;

	public abstract void shutdown();

	public ServerChannel getResponseChannel() {

		String channelName = "/bot/" + this.serviceName;
		ServerChannel serverChannel = this.bayeuxServer.getChannel(channelName);
		if (serverChannel != null)
			return serverChannel;

		ServerChannel.Initializer initializer = new ServerChannel.Initializer()
		{
			@Override
			public void configureChannel(ConfigurableServerChannel channel) {
				channel.setPersistent(true);
				channel.setLazy(false);
			}
		};

		this.bayeuxServer.createIfAbsent(channelName, initializer);
		return this.bayeuxServer.getChannel(channelName);
	}
}
