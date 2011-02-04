/**
 * Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
 * Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
 */
package org.coweb;

import java.io.Writer;
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
	
	private Writer outgoing = null;
	private Writer incoming = null;
	
	private static String NEWLINE = System.getProperty("line.separator");
	
	public CowebExtension(Writer incoming, Writer outgoing) {
        this.outgoing = outgoing;
        this.incoming = incoming;
	}
	
	private void writeMessage(String msg, Writer w) {
		try {
			w.write(msg);
			w.write(NEWLINE);
			w.flush();
		}
		catch(IOException e) { ; }
	}

	@Override
	public boolean rcv(ServerSession client, Mutable msg) {	
		this.writeMessage(msg.toString(), this.incoming);	
		return true;
	}

	@Override
	public boolean rcvMeta(ServerSession client, Mutable msg) {
		this.writeMessage(msg.toString(), this.incoming);	
		return true;
	}

	@Override
	public boolean sendMeta(ServerSession arg0, Mutable msg) {
		this.writeMessage(msg.toString(), this.outgoing);
		return true;
	}

	@Override
	public boolean send(ServerSession from, ServerSession to, ServerMessage.Mutable msg) {
		this.writeMessage(msg.toString(), this.outgoing);
		return true;
	}
}
