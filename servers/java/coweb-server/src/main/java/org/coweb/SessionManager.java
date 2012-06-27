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

//import javax.servlet.http.HttpServletRequest;

public class SessionManager extends AbstractService implements
		BayeuxServer.SessionListener {
	private static final Logger log = Logger.getLogger(SessionManager.class
			.getName());
	private static SessionManager singleton = null;

	/* Map from <confKey>:<cacheState> to SessionHandler. */
	private Map<String, SessionHandler> sessions = Collections
			.synchronizedMap(new HashMap<String, SessionHandler>());
	private Map<String, Object> config = null;

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

		bayeux.addListener(this);
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
	 * 
	 * @param confkey
	 *            The conference key
	 *
	 * @return SessionHandler
	 */
	public SessionHandler getSessionHandlerByConfkey(String confkey, boolean cacheState) {
		return this.sessions.get(confkey+":"+cacheState);
	}

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

	public void handleSubscribed(ServerSession serverSession, Message message)
			throws IOException {
		log.fine("SessionManager::handleSubscribed");
		log.fine(message.toString());

		SessionHandler handler = this.getSessionHandler(message);
		log.fine("handler = " + handler);

		if (handler != null)
			handler.onSubscribe(serverSession, message);
	}

	public void handleUnsubscribed(ServerSession serverSession, Message message)
			throws IOException {

		SessionHandler handler = this.getSessionHandler(message);
		if (handler != null) {
			handler.onUnsubscribe(serverSession, message);
		}
	}

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
			log.fine("could not find handler");
		}
	}

	/**
	 * Creates a new SessionHandler for the conference.
	 * 
	 * @param confkey
	 * @param collab
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

	@Override
	public void sessionAdded(ServerSession client) {
		log.fine("session added " + client);
		return;
		// TODO Auto-generated method stub

	}

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
