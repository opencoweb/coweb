/**
 * Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
 * Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
 */
package org.coweb.bots.transport;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.ArrayList;

import org.cometd.bayeux.Message;
import org.cometd.bayeux.server.ConfigurableServerChannel;
import org.cometd.bayeux.server.ServerChannel;
import org.cometd.bayeux.server.ServerSession;

import org.coweb.bots.Bot;
import org.coweb.bots.Proxy;

public class LocalTransport extends Transport implements Proxy {

	private Bot bot = null;
	private Map<String, ServerSession> clients = new HashMap<String, ServerSession>();

	private ArrayList<ServerSession> subscribers = new ArrayList<ServerSession>();

	public LocalTransport() {
		super();
	}

	public void init() {
		return;
	}

	public boolean subscribeUser(ServerSession client, Message message,
			boolean pub) throws IOException {

		if (this.bot == null) {
			this.bot = this.getBotInstance();
			if (this.bot == null)
				throw new IOException("unable to locate bot "
						+ this.serviceName);
		}

		if (pub) {
			this.bot.onSubscribe((String) client.getAttribute("username"));
			this.subscribers.add(client);
		}

		return true;
	}

	@Override
	public boolean unsubscribeUser(ServerSession client, Message message,
			boolean pub) throws IOException {

		// System.out.println("LocalTransport::unSubscribeUser");

		if (this.bot == null) {
			this.bot = this.getBotInstance();
			if (this.bot == null)
				throw new IOException("unable to locate bot "
						+ this.serviceName);
		}

		if (pub) {
			this.bot.onUnsubscribe((String) client.getAttribute("username"));
			this.subscribers.remove(client);
		}

		return true;

	}

	@Override
	public void shutdown() {
		// System.out.println("LocalTransport::shutdown");
		this.clients.clear();
		this.subscribers.clear();
		if (this.bot != null)
			this.bot.onShutdown();
	}

	@Override
	public boolean userRequest(ServerSession client, Message message)
			throws IOException {
		// System.out.println("LocalTransport::userRequest");
		// System.out.println("message = " + message);

		Map<String, Object> data = message.getDataAsMap();
		@SuppressWarnings("unchecked")
		Map<String, Object> params = (Map<String, Object>) data.get("value");
		String replyToken = (String) data.get("topic");
		String username = (String) client.getAttribute("username");

		if (this.bot == null) {
			this.bot = this.getBotInstance();
			if (this.bot == null)
				throw new IOException("unable to locate bot "
						+ this.serviceName);
		}

		this.clients.put(replyToken, client);
		this.bot.onRequest(params, replyToken, username);

		return true;
	}

	@Override
	public boolean syncEvent(ServerSession client, Message message)
			throws IOException {
		// System.out.println("LocalTransport::syncEvent");
		// System.out.println("message = " + message);

		Map<String, Object> data = message.getDataAsMap();

		String username = (String) client.getAttribute("username");

		if (this.bot == null) {
			this.bot = this.getBotInstance();
			if (this.bot == null)
				throw new IOException("unable to locate bot "
						+ this.serviceName);
		}

		this.bot.onSync(data, username);

		return true;
	}

	@Override
	public void reply(Bot bot, String replyToken, Map<String, Object> obj) {

		// System.out.println("LocalTransport::reply");
		// System.out.println("reply data = " + obj);
		ServerSession client = this.clients.get(replyToken);

		if (client == null) {
			// System.out.println("LocalTransport::error sending bot reply client not found");
			// TODO send error.
			return;
		}

		HashMap<String, Object> data = new HashMap<String, Object>();
		data.put("value", obj);
		data.put("topic", replyToken);

		// HashMap<String, Object> payload = new HashMap<String, Object>();
		// payload.put("data", data);

		// System.out.println("LocalTransport::reply");
		// System.out.println("payload = " + data);
		// System.out.println("replyToken = " + replyToken);

		client.deliver(this.server, "/service/bot/" + this.serviceName
				+ "/response", data, null);
		this.clients.remove(replyToken);
	}

	@Override
	public void publish(Bot bot, Map<String, Object> obj) {
		// System.out.println("LocalTransport::publish");

		HashMap<String, Object> data = new HashMap<String, Object>();
		data.put("value", obj);

		HashMap<String, Object> payload = new HashMap<String, Object>();
		payload.put("data", data);

		ServerChannel channel = this.getResponseChannel();
		for (ServerSession client : this.subscribers) {
			client.deliver(this.server, channel.getId(), data, null);
		}

		// System.out.println("LocalTransport::publish");
		// System.out.println(data);
		// System.out.println("channel = " + channel);
		/*
		 * Set<? extends ServerSession> clients = channel.getSubscribers();
		 * for(ServerSession client: clients) {
		 * System.out.println(client.getAttribute("username")); }
		 */
		// channel.publish(this.server, data, null);
	}

	private Bot getBotInstance() throws IOException {

		String className = (String) this.botConfig.get("class");
		if (className == null)
			throw new IOException("Error parsing bot descriptor");

		try {
			Class<? extends Bot> clazz = Class.forName(className).asSubclass(
					Bot.class);
			bot = clazz.newInstance();
			bot.setProxy(this);
			bot.init();

		} catch (Exception e) {
			throw new IOException("Error attempting to initialize bot "
					+ className + e.toString());
		}

		return bot;
	}

	private ServerChannel getResponseChannel() {

		String channelName = "/bot/" + this.serviceName;
		ServerChannel serverChannel = this.bayeuxServer.getChannel(channelName);
		if (serverChannel != null)
			return serverChannel;

		ServerChannel.Initializer initializer = new ServerChannel.Initializer() {
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
