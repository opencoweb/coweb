/**
 * Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
 * Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
 */
package org.coweb;

import org.cometd.bayeux.server.BayeuxServer;
import org.cometd.bayeux.server.ServerMessage;
import org.cometd.bayeux.server.ServerSession;
import org.cometd.bayeux.server.ServerChannel;
import org.cometd.bayeux.Message;

import org.cometd.server.transport.HttpTransport;
import org.cometd.server.DefaultSecurityPolicy;

import javax.servlet.http.HttpServletRequest;

/**
 * This class used to provide an extension point to handle permission checks for
 * coweb protocol events. Now, the moderator handles permission checking. This
 * class is kept around to handle the logic that sets a ServerSession's username
 * and sessionid attributes.
 * 
 */
public class CowebSecurityPolicy extends DefaultSecurityPolicy {

	public CowebSecurityPolicy() {
	}

	@Override
	public boolean canHandshake(BayeuxServer bayeuxServer,
			ServerSession client, ServerMessage message) {

		if (client.getLocalSession() != null)
			return super.canHandshake(bayeuxServer, client, message);

		SessionManager manager = SessionManager.getInstance();
		if (manager == null) {
			return true;
		}

		SessionHandler handler = manager.getSessionHandler(message);
		boolean allowed = false;

		if (handler != null) {
			allowed = true;
			HttpTransport transport = (HttpTransport) bayeuxServer
					.getCurrentTransport();
			HttpServletRequest req = transport.getCurrentRequest();

			String username = "anonymous";
			if (req != null && req.getRemoteUser() != null)
				username = req.getRemoteUser();

			client.setAttribute("username", username);
			client.setAttribute("sessionid", handler.getSessionId());

		}

		return allowed;
	}
}
