/**
 * Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
 * Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
 */
package org.coweb;

import org.cometd.bayeux.Message;
import org.cometd.bayeux.server.ServerSession;

import java.util.ArrayList;

public class DefaultDelegate implements SessionHandlerDelegate {

    protected SessionHandler sessionHandler = null;
    protected ServiceHandler serviceHandler = null;
    protected SessionManager sessionManager = null;

    public void DefaultDelegate() {
    }

    public void init(SessionHandler sessionHandler) {
        this.sessionHandler = sessionHandler;
        this.serviceHandler = this.sessionHandler.getServiceHandler();
        this.sessionManager = this.sessionHandler.getSessionManager();
    }

    public boolean onServiceRequest(ServerSession client, Message message) {
		try {
            this.serviceHandler.forwardUserRequest(client, message);
		}
		catch(Exception e) {
			e.printStackTrace();
        }

        return true;
    }

    public boolean onSync(ServerSession client, Message message) {
        //System.out.println("DefaultDelegate:::onSync");
        //System.out.println(message);
        try {
            this.serviceHandler.forwardSyncEvent(client, message);
        }
        catch(Exception e) { e.printStackTrace(); }

        return true;
    }


    public boolean onClientJoin(ServerSession client, Message message) {
        String channel = (String)message.get(Message.SUBSCRIPTION_FIELD);
		String cName = channel.substring(0, channel.length()-1);
		
		String siteidChannel = cName + "siteid";
		String stateChannel = cName + "state";
		ServerSession from = this.sessionManager.getServerSession();
		
		client.deliver(from, siteidChannel, new Integer(1), null);
		client.deliver(from, stateChannel, new ArrayList(), null);

        return true;
    }


    public boolean onSubscribeService(ServerSession client, 
                                      Message message) {
        try {
            this.serviceHandler.subscribeUser(client, message);
		}
		catch(Exception e) {
			e.printStackTrace();
		}

        return true;
    }

    public boolean onUnsubscribeService(ServerSession client,
            Message message) {
        try {
            this.serviceHandler.unSubscribeUser(client, message);
        }
        catch(Exception e) {
            e.printStackTrace();
        }

        return true;
    }
      
    /**
     * Called when a client sends it's state to the server after a send state
     * request.
     *
     * @param client The client sending the state
     * @param message Message containing the state in the data field.
     * @return true if this client is allowed to send state.
     */
    public boolean onUpdaterSendState(ServerSession client, Message message) {
        return true;
    }

    /**
     * Called after a client has been updated and is ready to be an updater.
     * 
     * @param client The client who is ready to be an updater.
     * @param message Message associated with the subscribe.
     * @return true if this client is allowed to be an updater.
     */
    public boolean onUpdaterSubscribe(ServerSession client, Message message) {
        return true;
    }

    public boolean onClientRemove(ServerSession client) {
        this.serviceHandler.removeUserFromAll(client);

        return true;
    }

    public boolean onEndSession() {

        return true;
    }
}
