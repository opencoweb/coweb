package org.coweb;

import java.util.Map;
import java.util.logging.Logger;

import org.cometd.bayeux.Message;
import org.cometd.bayeux.Session;
import org.cometd.bayeux.server.ServerSession;

public class ModeratorLateJoinHandler extends LateJoinHandler {
	private static final Logger log = Logger
			.getLogger(ModeratorLateJoinHandler.class.getName());

	private SessionModerator moderator = null;

	public ModeratorLateJoinHandler(SessionHandler sessionHandler,
			Map<String, Object> config) {
		super(sessionHandler, config);

		// get the moderator
		this.moderator = sessionHandler.getSessionModerator();
		Session client = (Session) this.moderator.getServerSession();

		// make sure the moderator has joined the conference and has a site
		// id before anyone joins.
		this.addSiteForClient(client);
		this.addUpdater(client, false);
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
		Object[] data = this.moderator.getLateJoinState();

		if (this.updaters.isEmpty())
			this.addUpdater(client, false);
		else
			this.addUpdater(client, true);

		client.batch(new BatchUpdateMessage(client, data, roster, siteId, true));
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
