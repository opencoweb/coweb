/**
 * Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
 * Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
 */
package org.coweb;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.logging.Logger;

import org.cometd.bayeux.Message;
import org.cometd.bayeux.server.ServerSession;
import org.cometd.bayeux.server.ServerChannel;
import org.coweb.bots.transport.Transport;

/**
 * This class is used to handle services for a particular coweb application session.
 */
public class ServiceHandler {

	private static final Logger log = Logger.getLogger(
			ServiceHandler.class.getName());

	private String sessionId = null;
	private Map<String, Transport> brokers = new HashMap<String, Transport>();
	private Map<String, Object> cowebConfig = null;

	public ServiceHandler(String sessionId, Map<String, Object> config) {
		log.info("ServiceHandler new Instance " + sessionId);
		this.sessionId = sessionId;
		this.cowebConfig = config;
	}

	/**
	 * Gets an existing instance of a service bot, or creates one if none exists
	 * yet. serviceName is checked against the coweb config. This method
	 * attempts to create the service class object, and if successful it returns
	 * the service bot. Otherwise, null is returned, which indicates a
	 * non existing service.
	 * @param serviceName The service name.
	 */
	@SuppressWarnings("unchecked")
	public Transport getServiceBroker(String serviceName) {

		log.fine("ServiceHandler::getServiceBroker for " + serviceName);
		Transport broker = this.brokers.get(serviceName);
		if (broker != null)
			return broker;

		log.fine(this.cowebConfig.get("bots").toString());
		Object[] botConfigs = (Object[]) this.cowebConfig.get("bots");
		if (botConfigs == null) {
			return null;
		}

		Map<String, Object> botConfig = null;
		for (int i = 0; i < botConfigs.length; i++) {
			Map<String, Object> tmp = (Map<String, Object>) botConfigs[i];
			String s = (String) tmp.get("service");

			if (s.equals(serviceName)) {
				botConfig = tmp;
				break;
			}
		}

		if (botConfig == null)
			return null;

		String brokerStr = (String) botConfig.get("broker");
		if (brokerStr == null) {
			if (botConfig.get("class") != null)
				brokerStr = "org.coweb.bots.transport.LocalTransport";
			else
				return null;
		}

		try {
			Class<? extends Transport> clazz = Class.forName(brokerStr)
					.asSubclass(Transport.class);
			broker = clazz.newInstance();
		} catch (Exception e) {
			e.printStackTrace();
			return null;
		}

		broker.setBotConfig(botConfig);
		broker.setSessionId(this.sessionId);
		this.brokers.put(serviceName, broker);
		return broker;
	}

	/**
	 * Unsubscribe a client from all services in this session.
	 * @param client The client to be removed.
	 */
	public void removeUserFromAll(ServerSession client) {
		for (Transport t : this.brokers.values()) {
			try {
				t.unsubscribeUser(client, true);
			} catch (Exception e) {
				e.printStackTrace();
			}
		}
	}

	/**
	 * Shuts down all services. Called when a coweb session ends (i.e. all
	 * clients leave the session).
	 */
	public void shutdown() {
		log.fine("ServiceHandler::shutdown");
		for (Transport transport : this.brokers.values()) {
			transport.shutdown();
		}
		this.brokers.clear();
	}

	/**
	 * Called when a client wants to (and is able to) subscribe to a service.
	 * @param client Client who is subscribing.
	 * @param message Message sent when trying to subscribe.
	 */
	public void subscribeUser(ServerSession client, Message message)
			throws IOException {
		log.fine("ServiceHandler::subscribeUser");
		String channel = (String) message.get(Message.SUBSCRIPTION_FIELD);
		boolean pub = true;

		if (channel.startsWith("/service"))
			pub = false;

		String serviceName = getServiceNameFromSubscription(message, pub);

		if (serviceName == null) {
			throw new IOException("improper subscription to channel "
					+ message.getChannel());
		}

		Transport broker = this.getServiceBroker(serviceName);
		if (broker == null) {
			throw new IOException("no broker to handle this service " + serviceName);
		}

		broker.subscribeUser(client, pub);
	}

	/**
	 */
	public void subscribeModerator(SessionModerator mod, String serviceName)
			throws IOException {
		Transport broker = this.getServiceBroker(serviceName);
		if (broker == null) {
			throw new IOException("no broker to handle this service " + serviceName);
		}

		broker.subscribeUser(mod.getServerSession(), true);
	}

	/**
	 * Notifies the client that subscribing is disallowed (per the moderator's
	 * decision).
	 * @param client Client who is subscribing.
	 * @param message Message sent when trying to subscribe.
	 */
	public void userCannotSubscribe(ServerSession client, Message message)
			throws IOException {

		String channel = (String) message.get(Message.SUBSCRIPTION_FIELD);
		boolean pub = true;
		if (channel.startsWith("/service"))
			pub = false;
		String serviceName = getServiceNameFromSubscription(message, pub);

		Transport broker = this.getServiceBroker(serviceName);
		if (null == broker)
			throw new IOException("no broker to handle this service " + serviceName);

		HashMap<String, Object> data = new HashMap<String, Object>();
		data.put("error", true);
		ServerChannel ch = broker.getResponseChannel();
		client.deliver(broker.getServer(), ch.getId(), data, null);
	}

	/**
	 * Called when a client unsubscribes from a service.
	 * @param client Client who is subscribing.
	 * @param message Message sent when trying to subscribe.
	 */
	public void unSubscribeUser(ServerSession client, Message message)
			throws IOException {

		log.fine("ServiceHandler::unSubscribeUser");
		String channel = (String) message.get(Message.SUBSCRIPTION_FIELD);
		boolean pub = true;

		if (channel.startsWith("/service"))
			pub = false;

		String serviceName = getServiceNameFromSubscription(message, pub);
		if (serviceName == null)
			throw new IOException("improper subscription to channel "
					+ message.getChannel());

		Transport broker = this.getServiceBroker(serviceName);
		if (broker == null)
			throw new IOException("no broker to handle this service "
					+ serviceName);

		broker.unsubscribeUser(client, pub);
	}

	/**
	 * Notify client that posting service messages is disallowed.
	 * @param client Client who is trying to post.
	 * @param message Message sent when trying to post.
	 */
	public void userCannotPost(ServerSession client, Message message)
			throws IOException {

		String serviceName = getServiceNameFromMessage(message, false);
		if (serviceName == null)
			throw new IOException("improper request channel "
					+ message.getChannel());

		Transport broker = this.getServiceBroker(serviceName);
		if (broker == null)
			throw new IOException("no broker to handle this service "
					+ serviceName);

		Map<String, Object> data = message.getDataAsMap();
		String replyToken = (String) data.get("topic");

		Map<String, Object> resp = new HashMap<String, Object>();
		resp.put("error", true);
		resp.put("topic", replyToken);

		client.deliver(broker.getServer(), "/service/bot/" +
				broker.getServiceName() + "/response", resp, null);
		return;
	}

	/**
	 * Called when a client wants to send a bot a private message.
	 * @param client Client who is subscribing.
	 * @param message Message sent when trying to subscribe.
	 */
	public void forwardUserRequest(ServerSession client, Message message)
			throws IOException {
		log.info(message.toString());
		String serviceName = getServiceNameFromMessage(message, false);
		if (serviceName == null)
			throw new IOException("improper request channel "
					+ message.getChannel());

		Transport broker = this.getServiceBroker(serviceName);
		if (broker == null)
			throw new IOException("no broker to handle this service "
					+ serviceName);

		broker.userRequest(client, message);
		return;
	}

	/**
	 * Extract the bot service name from a message.
	 * @param message
	 * @param pub Was message a public broadcast?
	 * @return Bot service name.
	 */
	public static String getServiceNameFromSubscription(Message message,
			boolean pub) {
		String channel = (String) message.get(Message.SUBSCRIPTION_FIELD);
		return getServiceNameFromChannel(channel, pub);
	}

	/**
	 * Extract the bot service name from a message.
	 * @param message
	 * @return Bot service name.
	 */
	public static String getServiceNameFromSubscription(Message message) {
		String channel = (String) message.get(Message.SUBSCRIPTION_FIELD);
		return getServiceNameFromChannel(channel, isPublicBroadcast(channel));
	}

	/**
	 * Extract the bot service name from a message.
	 * @param message
	 * @param pub Was message a public broadcast?
	 * @return Bot service name.
	 */
	public static String getServiceNameFromMessage(Message message, boolean pub) {
		String channel = message.getChannel();
		return getServiceNameFromChannel(channel, pub);
	}

	/**
	 * Extract the bot service name from a message.
	 * @param message
	 * @return Bot service name.
	 */
	public static String getServiceNameFromMessage(Message message) {
		String channel = message.getChannel();
		return getServiceNameFromChannel(channel, isPublicBroadcast(channel));
	}

	/**
	 * Extract a bot service name from a channel string.
	 * @param channel
	 * @param pub Was message a public broadcast?
	 * @return Bot service name.
	 */
	public static String getServiceNameFromChannel(String channel, boolean pub) {

		String[] parts = channel.split("/");
		String serviceName = null;

		if (pub) {
			if (parts.length == 3)
				serviceName = parts[2];
		} else {
			if (parts.length == 5
					&& (parts[4].equals("request") || parts[4]
							.equals("response")))
				serviceName = parts[3];
		}

		return serviceName;
	}

	/**
	 * Extract a bot service name from a channel string.
	 * @param channel
	 * @return Bot service name.
	 */
	public static String getServiceNameFromChannel(String channel) {
		return getServiceNameFromChannel(channel, isPublicBroadcast(channel));
	}

	/**
	 * Determine if the message was a public broadcast or private message.
	 * @param channel
	 * @return Whether or not the message was a public broadcast.
	 */
	public static boolean isPublicBroadcast(String channel) {
		return !channel.startsWith("/service");
	}

	/**
	 * Determine if the message was a public broadcast or private message.
	 * @param message
	 * @return Whether or not the message was a public broadcast.
	 */
	public static boolean isPublicBroadcast(Message message) {
		String channel = message.getChannel();
		return !channel.startsWith("/service");
	}

	/**
	 * Check if a message was sent on a service channel.
	 * @param message
	 * @return Is this a service message?
	 */
	public static boolean isServiceMessage(Message message) {
		String channel = message.getChannel();
		return channel.startsWith("/service/bot") || channel.startsWith("/bot");
	}

}

