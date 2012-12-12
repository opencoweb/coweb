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

/**
 * Abstract base class for new transport implementations between coweb server
 * and service bots. Instantiated per service bot instance per session.
 */
public abstract class Transport {

	/**
	 * Contains bot configuration options and metadata.
	 */
	protected Map<String, Object> botConfig = null;

	/**
	 * Name of the service provided by the bot communicating via this transport.
	 */
	protected String serviceName = null;

	/**
	 * Unique ID of the session to which the transport is bridging its bot
	 */
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

	/**
	 * The coweb server calls this method when a session decides to launch a
	 * service bot using this transport.
	 * @return True iff initialization is successful
	 */
	public abstract void init();

	/**
	 * The coweb server calls this method when a coweb application subscribes to
	 * the service bot using this transport. The transport should notify its bot
	 * of the subscription.
	 * @param client instance representing the application that sent the message
	 * @param message instance representing the service subscription message
	 * @param pub True iff subscribing to the bot's public broadcast channel
	 * @return Always return True
	 * @throws IOException When the transport experiences a failure delivering
	 *    the message
	 */
	public abstract boolean subscribeUser(ServerSession client,
			boolean pub) throws IOException;

	/**
	 * The coweb server calls this method when a coweb application unsubscribes
	 * from the service bot using this transport. The transport should notify
	 * its bot of the unsubscribe.
	 * @param client instance representing the application that sent the message
	 * @param message instance representing the service subscription message
	 * @param pub True iff subscribing to the bot's public broadcast channel
	 * @return Always return True
	 * @throws IOException When the transport experiences a failure delivering
	 *    the message
	 */
	public abstract boolean unsubscribeUser(ServerSession client,
			boolean pub) throws IOException;

	/**
	 * The coweb server calls this method when a coweb application sends a
	 * private request to the service bot using this transport. The transport
	 * should notify its bot of the request.
	 * @param client instance representing the application that sent the message
	 * @param message instance representing the service subscription message
	 * @return Always return True
	 * @throws IOException When the transport experiences a failure delivering
	 *    the message
	 */
	public abstract boolean userRequest(ServerSession client, Message message)
			throws IOException;

	/**
	 * The coweb server calls this method when a session decides to shut down
	 * the service bot using this transport. The transport should notify its bot
	 * of the impending shutdown.
	 */
	public abstract void shutdown();

}
