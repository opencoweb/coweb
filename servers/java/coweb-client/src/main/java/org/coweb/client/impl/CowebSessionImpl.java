package org.coweb.client.impl;

import org.cometd.client.BayeuxClient;
import org.cometd.client.transport.ClientTransport;
import org.cometd.client.transport.LongPollingTransport;
import org.coweb.client.ICowebSession;
import org.eclipse.jetty.client.HttpClient;

public class CowebSessionImpl implements ICowebSession {

	public void init() throws Exception {
		// Prepare the HTTP transport
		HttpClient httpClient = new HttpClient();
		httpClient.start();
		ClientTransport  httpTransport = new LongPollingTransport(null, httpClient);

		// Configure the BayeuxClient, with the websocket transport listed before the http transport
		BayeuxClient client = new BayeuxClient("http://localhost:8080/cometd", httpTransport);

		// Handshake
		client.handshake();
	}
}
