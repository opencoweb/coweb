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
import org.coweb.bots.transport.Transport;

/**
 * This class is used to handle services for a particular coweb application session.
 */
public class ServiceHandler {

	private static final Logger log = Logger.getLogger(ServiceHandler.class
			.getName());

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
			botConfig = (Map<String, Object>) botConfigs[i];
			String s = (String) botConfig.get("service");

			if (s.equals(serviceName)) {
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
				t.unsubscribeUser(client, null, true);
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

		broker.subscribeUser(client, message, pub);
	}

	/**
	 * Notifies the client that subscribing is disallowed (per the moderator's
	 * decision).
	 * @param client Client who is subscribing.
	 * @param message Message sent when trying to subscribe.
	 */
	public void userCannotSubscribe(ServerSession client,
			Message message) throws IOException {

		String channel = (String) message.get(Message.SUBSCRIPTION_FIELD);
		boolean pub = true;
		if (channel.startsWith("/service"))
			pub = false;
		String serviceName = getServiceNameFromSubscription(message, pub);

		Transport broker = this.getServiceBroker(serviceName);
		if (null == broker)
			throw new IOException("no broker to handle this service " + serviceName);

		broker.userCannotSubscribe(client, message);
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

		broker.unsubscribeUser(client, message, pub);
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

		broker.userCannotPost(client, message);
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
	 */
	public static String getServiceNameFromSubscription(Message message,
			boolean pub) {
		String channel = (String) message.get(Message.SUBSCRIPTION_FIELD);
		return getServiceNameFromChannel(channel, pub);
	}

	/**
	 * Extract the bot service name from a message.
	 */
	public static String getServiceNameFromMessage(Message message, boolean pub) {
		String channel = message.getChannel();
		return getServiceNameFromChannel(channel, pub);
	}

	/**
	 * Extract a bot service name from a channel string.
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
}

