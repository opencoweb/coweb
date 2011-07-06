/**
 * Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
 * Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
 */
package org.coweb;

import org.cometd.bayeux.Message;
import org.cometd.bayeux.server.ServerSession;

import java.util.ArrayList;
import java.util.Map;

public class DefaultDelegate implements SessionHandlerDelegate {

    protected SessionHandler sessionHandler = null;
    protected ServiceHandler serviceHandler = null;
    protected SessionManager sessionManager = null;
    protected UpdaterTypeMatcher updaterTypeMatcher = null;
    protected boolean cacheState = false;

    public void DefaultDelegate() {
    }
    
    public void init(SessionHandler sessionHandler, boolean cacheState, UpdaterTypeMatcher updaterTypeMatcher) {
        this.sessionHandler = sessionHandler;
        this.serviceHandler = this.sessionHandler.getServiceHandler();
        this.sessionManager = this.sessionHandler.getSessionManager();
        this.cacheState = cacheState;
        this.updaterTypeMatcher = updaterTypeMatcher;
    }

    public boolean onServiceRequest(ServerSession client, Message message) {
		try {
			Map<String, Object> data = message.getDataAsMap();
			String topic = (String)data.get("topic");
			if(!topic.startsWith("coweb.engine.sync"))
				this.serviceHandler.forwardUserRequest(client, message);
		}
		catch(Exception e) {
			e.printStackTrace();
        }

        return true;
    }

    public boolean onSync(ServerSession client, Message message) {
        return true;
    }


    public void onClientJoin(ServerSession client, Message message) {
        String channel = (String)message.get(Message.SUBSCRIPTION_FIELD);
		String cName = channel.substring(0, channel.length()-1);
		
		String siteidChannel = cName + "siteid";
		String stateChannel = cName + "state";
		ServerSession from = this.sessionManager.getServerSession();
		
		client.deliver(from, siteidChannel, new Integer(1), null);
		client.deliver(from, stateChannel, new ArrayList(), null);
    }


    public void onSubscribeService(ServerSession client, 
                                      Message message) {
        try {
            this.serviceHandler.subscribeUser(client, message);
		}
		catch(Exception e) {
			e.printStackTrace();
		}
    }

    public void onUnsubscribeService(ServerSession client,
            Message message) {
        try {
            this.serviceHandler.unSubscribeUser(client, message);
        }
        catch(Exception e) {
            e.printStackTrace();
        }
    }
      
    /**
     * Called when a client sends it's state to the server after a send state
     * request.
     *
     * @param client The client sending the state
     * @param message Message containing the state in the data field.
     * @return true if this client is allowed to send state.
     */
    public void onUpdaterSendState(ServerSession client, Message message) {
        return;
    }

    /**
     * Called after a client has been updated and is ready to be an updater.
     * 
     * @param client The client who is ready to be an updater.
     * @param message Message associated with the subscribe.
     */
    public void onUpdaterSubscribe(ServerSession client, Message message) {
        return;
    }

    public boolean onClientRemove(ServerSession client) {
        this.serviceHandler.removeUserFromAll(client);

        return true;
    }

    public boolean onEndSession() {

        return true;
    }
}
