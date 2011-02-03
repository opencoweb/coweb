/**
 * Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
 * Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
 */
package org.coweb;

import org.cometd.bayeux.Message;
import org.cometd.bayeux.server.ServerSession;

public interface SessionHandlerDelegate {

    /**
     * Called when a session is first being initialized.
     *
     * @param sessionHandler The org.coweb.SessionHandler object which 
     * invokes this delegate.
     */
    public void init(SessionHandler sessionHandler);

    /**
     * Called when a user attempts to send a request to a service in a 
     * session. 
     * @return true if the user can send the request or false if not.
     */
    public boolean onServiceRequest(ServerSession client, Message message);

    /**
     * Called when a client sends a sync message.  Implementations should
     * forward sync events to the bots.
     *
     * @param client Client who sent the sync.
     * @param message Message containg sync event.
     *
     * @return true if this sync event should forwarded to the bots
     */
    public boolean onSync(ServerSession client, Message message);

    /**
     * Called when a client joins a prepared session.
     */
    public void onClientJoin(ServerSession client, Message message);

    /**
     * Called when a user attempts to join a coweb session.
     */
    public void onSubscribeService(ServerSession client, 
                                      Message message);

    /**
     * Called when a user attempts to unsubscribe from a service in a 
     * session. 
     * @return true if the user can unsubscribe or false if not.
     */
    public boolean onUnsubscribeService(ServerSession client,
            Message message);
                      
    /**
     * Called when a client sends it's state to the server after a send state
     * request.
     *
     * @param client The client sending the state
     * @param message Message containing the state in the data field.
     * @return true if this client is allowed to send state.
     */
    public boolean onUpdaterSendState(ServerSession client, Message message);
    
    /**
     * Called after a client has been updated and is ready to be an updater.
     * 
     * @param client The client who is ready to be an updater.
     * @param message Message associated with the subscribe.
     * @return true if this client is allowed to be an updater.
     */
    public boolean onUpdaterSubscribe(ServerSession client, Message message);

    /**
     * Called when a client leaves a session.
     *
     * @return true if client was successfully removed.
     */
    public boolean onClientRemove(ServerSession client);

    /**
     * Called when a session is ending.
     *
     * @return true if session ended properly.
     */
    public boolean onEndSession();
}
