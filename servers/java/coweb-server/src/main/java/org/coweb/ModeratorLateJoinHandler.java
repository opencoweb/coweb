package org.coweb;

import java.util.Map;
import java.util.HashMap;
import java.util.logging.Logger;

import org.cometd.bayeux.Message;
import org.cometd.bayeux.server.ServerSession;

import org.eclipse.jetty.util.ajax.JSON;

public class ModeratorLateJoinHandler extends LateJoinHandler {
	private static final Logger log = Logger
			.getLogger(ModeratorLateJoinHandler.class.getName());


	public ModeratorLateJoinHandler(SessionHandler sessionHandler,
			Map<String, Object> config) {
		super(sessionHandler, config);	
	}

	@Override
	public void onClientJoin(ServerSession client, Message message) {
		log.info("ModeratorLateJoinHandler::onClientJoin *************");
		int siteId = this.getSiteForClient(client);

		if (siteId == -1) {
			siteId = this.addSiteForClient(client);
		}

		log.info("siteId = " + siteId);
		Map<Integer, String> roster = this.getRosterList(client);

		// Construct message: 1) app data, 2) engine state.
		Map<String, Object> collabs = this.sessionModerator.getLateJoinState();
		Object[] data = new Object[collabs.size() + 1];

		// 1) App data.
		int cnt = 0;
		for (Map.Entry<String, Object> collab: collabs.entrySet()) {
			HashMap<String, Object> hm = new HashMap<String, Object>();
			hm.put("topic", "coweb.state.set." + collab.getKey());
			hm.put("value", collab.getValue());
			data[cnt++] = hm;
		}

		// 2) Engine state.
		HashMap<String, Object> engState = new HashMap<String, Object>();
		engState.put("topic", "coweb.engine.state");
		engState.put("value", this.sessionHandler.getEngineState());
		data[cnt++] = engState;

		/* 3) Paused sync buffer. Since the moderator never pauses itself from processing sync events, we can safely
		  ignore sending this (we would be sending an empty array otherwise). */
		/* HashMap<String, Object> pauseState = new HashMap<String, Object>();
		pauseState.put("topic", "coweb.pause.state");
		pauseState.put("value", new Object[0]);
		data[cnt++] = pauseState; */

		if (this.updaters.isEmpty())
			this.addUpdater(client, false);
		else
			this.addUpdater(client, true);

		client.batch(new BatchUpdateMessage(client, siteId, roster, data, true));
	}

	public void onUpdaterSendState(ServerSession client, Message message) {
		// should never get here.
		return;
	}

	@Override
	protected void removeUpdater(ServerSession client) {
		this.removeSiteForClient(client);
		this.updaters.remove(client.getId());
		this.sendRosterUnavailable(client);
	}

}
