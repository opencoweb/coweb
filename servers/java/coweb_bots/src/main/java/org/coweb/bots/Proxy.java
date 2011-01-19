/**
 * Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
 */
package org.coweb.bots;

import java.util.Map;

public interface Proxy {

	public void reply(Bot bot, String replyToken, Map<String, Object> data);
		
	public void publish(Bot bot, Map<String, Object> obj);
	
}
