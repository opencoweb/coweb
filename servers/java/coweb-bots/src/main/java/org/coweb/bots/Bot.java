/**
 * Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
 * Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
 */
package org.coweb.bots;

import java.util.Map;

/**
 * Interface that any coweb bot must define.
 */
public interface Bot {

    /**
     * The bot Proxy will call this method when a new session has been
     * created and a user has subscribed to this bot's service.
     */    
	public void init();

    /**
     * Called when a user subscribes to the service provided by this bot.
     * @param username The username of the client subscribing.
     */
	public void onSubscribe(String username);
	
    /**
     * Called when a user unsubscribes to the service provided by this bot.
     * @param username The username of the client unsubscribing.
     */
	public void onUnsubscribe(String username);

    /**
     * Called when a user make a private request to this bot.
     *
     * @param params key value pairs of parameters sent by the user.
     * @param replyToken token associated with this request.  The bot must 
     * pass this token back to the proxy when replying to this request.
     * @param username The username of the client making this request.    
     */
	public void onRequest(Map<String, Object> params, 
			String replyToken,
			String username);

    /**
     * Called when a sync events occurs in the session.
     *
     * @param params key value pairs containing the sync event info.
     * @param username the username from whom this sync originated.
     */
	public void onSync(Map<String, Object> params, String username);

    /**
     * Called when the bot service is to shutdown.  Allows the bot to do
     * any cleanup that it needs to.
     */    
	public void onShutdown();

    /**
     * Sets the proxy object this bot should use to reply to subscribes, 
     * sync, requests, etc.
     *
     * @param proxy The proxy object.
     */    
	public void setProxy(Proxy proxy);
}
