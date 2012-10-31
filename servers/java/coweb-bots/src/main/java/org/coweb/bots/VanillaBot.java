/**
 * Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
 * Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
 */
package org.coweb.bots;

import java.util.Map;

/**
 * Implement the Bot interface with nops for all public methods.
 */
public abstract class VanillaBot implements Bot {

	public void init() {
    }

	public void onSubscribe(String username) {
    }
	
	public void onUnsubscribe(String username) {
    }

	public void onRequest(Map<String, Object> params, 
			String replyToken,
			String username) {
    }

	public void onShutdown() {
    }

    /* We don't override setProxy, since implementors of Bot almost certainly
     * need to handle this and not let it be a nop.
	public void setProxy(Proxy proxy) {
    }
    */

}
