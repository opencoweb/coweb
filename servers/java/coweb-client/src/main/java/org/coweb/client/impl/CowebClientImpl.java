package org.coweb.client.impl;

import java.util.Map;

import org.coweb.client.ICowebClient;
import org.coweb.client.ICowebSession;

public class CowebClientImpl implements ICowebClient {
	
	
	public CowebClientImpl() {
		;
	}
	
	
	
	public ICowebSession initSession() {
		return new CowebSessionImpl();
	}
	
	public void prepare(Map<String, String> args) {
		return;
	}

}
