package org.coweb.client;

public class SessionBuilder {
	
	public static ICowebClient getClient() {
		return new org.coweb.client.impl.CowebClientImpl();
	}

}
