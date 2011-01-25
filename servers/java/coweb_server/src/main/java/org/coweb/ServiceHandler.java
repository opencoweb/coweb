/**
 * Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
 * Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
 */
package org.coweb;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Properties;

import org.cometd.bayeux.Message;
import org.cometd.bayeux.server.BayeuxServer;
import org.cometd.bayeux.server.ServerSession;
import org.coweb.bots.transport.Transport;


public class ServiceHandler {
	
	private String sessionId = null;
	private BayeuxServer bayeuxServer = null;
	private Map<String, Transport> brokers = new HashMap<String, Transport>();
	
	public ServiceHandler(String sessionId) {
		
		this.sessionId = sessionId;
		SessionManager manager = SessionManager.getInstance();
		this.bayeuxServer = manager.getBayeux();
	}
	
	
	public Transport getServiceBroker(String serviceName) {
		
		//System.out.println("ServiceHandler::getServiceBroker for " + serviceName);
		Transport broker = this.brokers.get(serviceName);
		if(broker != null) 
			return broker;
		
		SessionManager manager = SessionManager.getInstance();
		
		Properties botConfig = manager.loadPropertyFile("/WEB-INF/"+serviceName+".properties");
		if(botConfig == null)
			return null;
		
		String brokerStr = (String)botConfig.get("broker");
		if(brokerStr == null) {
            if(botConfig.get("class") != null)
                brokerStr = "org.coweb.bots.transport.LocalTransport";
            else
                return null;
        }

		try {
			Class clazz = Class.forName(brokerStr);
			broker = (Transport)clazz.newInstance();
		}
		catch(Exception e) {
			e.printStackTrace();
			return null;
		}
		
		broker.setBotConfig(botConfig);
		broker.setSessionId(this.sessionId);
		
		this.brokers.put(serviceName, broker);
		
		return broker;
	}
	
	
	public void removeUserFromAll(ServerSession client) {
		for(Transport t: this.brokers.values()) {
			try {
				t.unSubscribeUser(client, null, true);
			}
			catch(Exception e) { e.printStackTrace(); }
		}
	}
	
	public void shutdown() {

        System.out.println("ServiceHandler::shutdown");
		
		for(Transport transport: this.brokers.values()) {
			transport.shutdown();
		}
		
		this.brokers.clear();
	}
	
	
	public void subscribeUser(ServerSession client, Message message) 
		throws IOException {
		
		//System.out.println("ServiceHandler::subscribeUser");
		String channel = (String)message.get(Message.SUBSCRIPTION_FIELD);
        boolean pub = true;

        if(channel.startsWith("/service"))
            pub = false;

		String serviceName = getServiceNameFromSubscription(message, pub);
		
		if(serviceName == null)
			throw new IOException("improper subscription to channel " + message.getChannel());
		
		Transport broker = this.getServiceBroker(serviceName);
		if(broker == null)
			throw new IOException("no broker to handle this service " + serviceName);
		
		broker.subscribeUser(client, message, pub);
	}
	
	public void unSubscribeUser(ServerSession client, Message message) 
	throws IOException {
	
		//System.out.println("ServiceHandler::unSubscribeUser");
		String channel = (String)message.get(Message.SUBSCRIPTION_FIELD);
        boolean pub = true;

        if(channel.startsWith("/service"))
            pub = false;

		String serviceName = getServiceNameFromSubscription(message, pub);
		if(serviceName == null)
			throw new IOException("improper subscription to channel " + message.getChannel());
		
		Transport broker = this.getServiceBroker(serviceName);
		if(broker == null)
			throw new IOException("no broker to handle this service " + serviceName);

		broker.unSubscribeUser(client, message, pub);
	}
	
	public void forwardUserRequest(ServerSession client, Message message)
	throws IOException {
		//System.out.println("ServiceHandler::forwardUserRequest");
	    String serviceName = getServiceNameFromMessage(message, false);
	    if(serviceName == null)
	    	throw new IOException("improper request channel " + message.getChannel());

		Transport broker = this.getServiceBroker(serviceName);
		if(broker == null)
			throw new IOException("no broker to handle this service " + serviceName);

		broker.userRequest(client, message);
		return;
	}

    public void forwardSyncEvent(ServerSession client, Message message)
        throws IOException {
        //System.out.println("fowardSyncEvent");

		for(Transport t: this.brokers.values()) {
            t.syncEvent(client, message);
		}
    }

	
	public static String getServiceNameFromSubscription(Message message, boolean pub) {
		String channel = (String)message.get(Message.SUBSCRIPTION_FIELD);
		
		return getServiceNameFromChannel(channel, pub);
		
	}
	
	public static String getServiceNameFromMessage(Message message, boolean pub) {
		String channel = message.getChannel();
		
		return getServiceNameFromChannel(channel, pub);
	}
	
	public static String getServiceNameFromChannel(String channel, boolean pub) {
		
		String[] parts = channel.split("/");
		String serviceName = null;

		if(pub) {
			if(parts.length == 3)
				serviceName = parts[2];
		}
		else {
			if(parts.length == 5 &&
			  (parts[4].equals("request") || parts[4].equals("response")))
				serviceName = parts[3];
		}
		
		return serviceName;	
	}
	
}
