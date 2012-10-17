/**
 * Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
 * Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
 */
package org.coweb;

import java.io.IOException;
import java.util.Map;
import java.util.HashMap;
import java.util.StringTokenizer;
import java.util.Collection;
import java.util.Collections;

import java.util.logging.Logger;

import org.cometd.server.AbstractService;
import org.cometd.bayeux.Message;
import org.cometd.bayeux.Session;
import org.cometd.bayeux.server.BayeuxServer;
import org.cometd.bayeux.server.ServerSession;

/**
 * SessionMananger handles all bayeux traffic and redirects messages to the
 * appropriate SessionHandler. In theory, should be one SessionManager for
 * each server instance.
 */
public class SessionManager extends AbstractService implements
		BayeuxServer.SessionListener {
	private static final Logger log = Logger.getLogger(SessionManager.class
			.getName());
	private static SessionManager singleton = null;

	/* Map from <confKey>:<cacheState> to SessionHandler. */
	private Map<String, SessionHandler> sessions = Collections
			.synchronizedMap(new HashMap<String, SessionHandler>());
	private Map<String, Object> config = null;

    /**
     * Creates service listeners for bayeux messages on /meta, /service, and
     * /bot.
     */
	private SessionManager(BayeuxServer bayeux, Map<String, Object> config) {
		super(bayeux, "session");

		this.config = config;
		this.addService("/meta/subscribe", "handleSubscribed");
		this.addService("/meta/unsubscribe", "handleUnsubscribed");
		this.addService("/session/roster/*", "handleMessage");
		this.addService("/service/session/join/*", "handleMessage");
		this.addService("/service/session/updater", "handleMessage");
		this.addService("/service/bot/**", "handleMessage");
		this.addService("/bot/**", "handleMessage");

	}

	public static SessionManager newInstance(Map<String, Object> config,
			BayeuxServer bayeux) {

		if (singleton != null)
			return singleton;

		singleton = new SessionManager(bayeux, config);
		singleton.setSeeOwnPublishes(false);

		return singleton;
	}

	public static SessionManager getInstance() {
		return singleton;
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
		if (sessionId.equals("service")) {
			sessionId = st.nextToken();
		}

		return sessionId;
	}

    /**
     * Extract the sessionId fro a bayeux message.
     * @param message Bayeux message containing the sessionId.
     * @return sessionId
     */
	public static String getSessionIdFromMessage(Message message) {
		Map<String, Object> ext = message.getExt();
		if (ext == null)
			return null;

		@SuppressWarnings("unchecked")
		Map<String, Object> cowebExt = (Map<String, Object>) ext.get("coweb");
		if (cowebExt == null)
			return null;

		String sessionId = (String) cowebExt.get("sessionid");
		return sessionId;
	}

    /**
     * Find the SessionHandler associated with a bayeux message.
     * @param message Bayeux message containing the sessionId.
     * @return The associated SessionHandler.
     */
	public SessionHandler getSessionHandler(Message message) {
		String sessionId = getSessionIdFromMessage(message);
		log.fine("sessionId = " + sessionId);
		return this.getSessionHandler(sessionId);
	}

	public Collection<SessionHandler> getAllSessions() {
		return this.sessions.values();
	}

	public SessionHandler getSessionHandler(ServerSession client) {
		String sessionId = (String) client.getAttribute("sessionid");
		return this.getSessionHandler(sessionId);
	}

	/**
	 * @param confkey The conference key.
	 * @return SessionHandler
	 */
	public SessionHandler getSessionHandlerByConfkey(String confkey, boolean cacheState) {
		return this.sessions.get(confkey+":"+cacheState);
	}

    /**
     * @param sessionId The sessionId key for finding the SessionHandler.
	 * @return SessionHandler
     */
	public SessionHandler getSessionHandler(String sessionId) {
		if (this.sessions.isEmpty()) {
			return null;
		}
		for (SessionHandler h : this.sessions.values()) {
			if (h.getSessionId().equals(sessionId)) {
				return h;
			}
		}
		return null;
	}

    /**
     * Handles a client subscribing to a coweb session.
     * @param serverSession The client wishing to subscribe.
     * @param message The associated bayeux message.
     */
	public void handleSubscribed(ServerSession serverSession, Message message)
			throws IOException {
		log.fine("SessionManager::handleSubscribed");
		log.fine(message.toString());

		SessionHandler handler = this.getSessionHandler(message);
		log.fine("handler = " + handler);

		if (handler != null)
			handler.onSubscribe(serverSession, message);
	}

    /**
     * Handles a client unsubscribing from a coweb session.
     * @param serverSession The client unsubscribing.
     * @param message The associated bayeux message.
     */
	public void handleUnsubscribed(ServerSession serverSession, Message message)
			throws IOException {

		SessionHandler handler = this.getSessionHandler(message);
		if (handler != null) {
			handler.onUnsubscribe(serverSession, message);
		}
	}

    /**
     * Handles messages published to the following channels.
     *   <li> /session/roster/*
     *   <li> /service/session/join/*
     *   <li> /service/session/updater
     *   <li> /service/bot/**
     *   <li> /bot/**
     *
     * The associated SessionHandler object's onPublish method is invoked.
     */
	public void handleMessage(ServerSession remote, Message message) {

		String sessionId = (String) remote.getAttribute("sessionid");
		SessionHandler handler = null;
		if (sessionId == null)
			handler = this.getSessionHandler(message);
		else
			handler = this.getSessionHandler(sessionId);

		if (handler != null) {
			log.fine(handler.toString());
			handler.onPublish(remote, message);
		} else {
			log.warning("could not find handler");
		}
	}

	/**
	 * Creates a new SessionHandler for the conference.
	 * 
	 * @param confkey
	 * @param cacheState
	 */
	public SessionHandler createSession(String confkey, boolean cacheState) {
		log.info("SessionManager::createSession ************");
		SessionHandler handler = this.getSessionHandler(confkey);

		if (handler == null) {
			handler = new SessionHandler(confkey, cacheState, this.config);
			this.sessions.put(confkey+ ":" + handler.isCachingState(), handler);
		}

		return handler;
	}

	public void removeSessionHandler(SessionHandler handler) {
		this.removeSessionHandler(handler.getConfKey(),
				handler.isCachingState());
	}

    /**
     * Remove a SessionHandler object from the SessionManager. This is called
     * when a coweb session ends (i.e. all clients have left the session).
     */
	public void removeSessionHandler(String confkey, boolean cacheState) {

		log.info("SessionManager::removeSessionHandler ***********");
		SessionHandler handler = this.sessions.remove(confkey + ":"
				+ cacheState);
		log.info("handler = " + handler);

		handler = null;
	}

	public void disconnectClient(String sessionId, String siteId) {
		log.info("SessionManager::disconnectClient *********");
		log.info("sessionId = " + sessionId + " siteId = " + siteId);
		SessionHandler handler = this.getSessionHandler(sessionId);
		if (handler == null) {
			log.severe("handler not found for sessionId = " + sessionId
					+ " siteId = " + siteId);
			return;
		}

		ServerSession client = handler.getServerSessionFromSiteid(siteId);
		if (client != null) {
			log.info("ServerSession found about to call disconnect");
			client.disconnect();
		} else {
			log.severe("ServerSession not found from handler delegate sessionId = "
					+ sessionId);
		}
	}

    /**
     * Callback invoked when a ServerSession has been added to a BayeuxServer
     * object.
     * @param client The session added.
     */
	@Override
	public void sessionAdded(ServerSession client) {
		log.fine("session added " + client);
		return;
	}

    /**
     * Callback invoked when a ServerSession has been removed from a
     * BayeuxServer object.
     * @param client The session removed.
     * @param timeout Whether the session has been removed for a timeout or not.
     */
	@Override
	public void sessionRemoved(ServerSession client, boolean timeout) {
		log.fine("SessionManager::sessionRemoved");
		String sessionId = (String) client.getAttribute("sessionid");
		SessionHandler handler = this.getSessionHandler(sessionId);

		if (handler == null)
			return;

		handler.onPurgingClient(client);
	}

}

