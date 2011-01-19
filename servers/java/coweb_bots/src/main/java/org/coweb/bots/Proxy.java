/**
 * Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
 */
package org.coweb.bots;

import java.util.Map;

/**
 * Interface used by the bots to send messages back to the session.
 */
public interface Proxy {

    /**
     * Allows the bot to reply to a private user request.  The message
     * will only go to the participant who sent the request.
     *
     * @param bot The bot making the reply.
     * @param replyToken The token associated with the user request.
     * @param data The data to send to the client.
     */
	public void reply(Bot bot, String replyToken, Map<String, Object> data);
		
    /**
     * Allows the bot to publish data to the session.  
     *
     * @param bot The bot performing the publish.
     * @param data The data to send to the session.
     */
	public void publish(Bot bot, Map<String, Object> data);
	
}
