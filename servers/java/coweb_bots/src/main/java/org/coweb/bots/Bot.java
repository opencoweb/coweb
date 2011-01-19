/**
 * Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
 */
package org.coweb.bots;

import java.util.Map;

public interface Bot {
	
	public void init();
	
	public void onSubscribe(String userName);
	
	public void onUnsubscribe(String userName);
	
	public void onRequest(Map<String, Object> params, 
			String replyToken,
			String userName);

	public void onSync(Map<String, Object> params, String userName);
	
	public void onShutdown();
	
	public void setProxy(Proxy proxy);

}
