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

		// Construct message: 1) app data, 2) engine state, 3) pause state.
		Object[] appData = this.sessionModerator.getLateJoinState();
		// Can we do this better? not have to copy the array...TODO
		Object[] data = new Object[appData.length + 2];
		System.arraycopy(appData, 0, data, 0, appData.length);

		HashMap<String, Object> engState = new HashMap<String, Object>();
		engState.put("topic", "coweb.engine.state");
		engState.put("value", this.sessionHandler.getEngineState());

		HashMap<String, Object> pauseState = new HashMap<String, Object>(); // TODO pause.state??
		pauseState.put("topic", "coweb.pause.state");
		pauseState.put("value", new Object[0]);

		data[data.length - 2] = engState;
		data[data.length - 1] = pauseState;

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
