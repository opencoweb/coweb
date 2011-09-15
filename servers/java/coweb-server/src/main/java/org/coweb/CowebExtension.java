/**
 * Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
 * Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
 */
package org.coweb;

import java.io.PrintWriter;
import java.io.IOException;

import org.cometd.bayeux.server.ServerMessage;
import org.cometd.bayeux.server.ServerSession;
import org.cometd.bayeux.server.BayeuxServer;
import org.cometd.bayeux.server.ServerMessage.Mutable;

/**
 * Convenience class that could be used for debugging.  All incoming and 
 * outgoing bayeux messages will be logged to thie provided streams.
 */
public class CowebExtension implements BayeuxServer.Extension {
	
	private PrintWriter outgoing = null;
	private PrintWriter incoming = null;
	
	private static String NEWLINE = System.getProperty("line.separator");
	
	public CowebExtension(PrintWriter incoming, PrintWriter outgoing) {
        this.outgoing = outgoing;
        this.incoming = incoming;
	}
	
	private void writeMessage(String msg, PrintWriter w) {
		try {
			w.println(msg);
			w.println();
			//w.write(NEWLINE);
			w.flush();
		}
		catch(Exception e) { ; }
	}

	@Override
	public boolean rcv(ServerSession client, Mutable msg) {	
		if(client != null)
			this.incoming.println("received message from " + client.getId());
		this.writeMessage(msg.toString(), this.incoming);	
		return true;
	}

	@Override
	public boolean rcvMeta(ServerSession client, Mutable msg) {
		//this.writeMessage(msg.toString(), this.incoming);	
		return true;
	}

	@Override
	public boolean sendMeta(ServerSession arg0, Mutable msg) {
		//this.writeMessage(msg.toString(), this.outgoing);
		return true;
	}

	@Override
	public boolean send(ServerSession from, ServerSession to, ServerMessage.Mutable msg) {
		if(to != null)
			this.outgoing.println("sending message to " + to.getId());
		this.writeMessage(msg.toString(), this.outgoing);
		return true;
	}
}
