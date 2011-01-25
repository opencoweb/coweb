/**
 * Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
 * Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
 */
package org.coweb;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.PrintWriter;
import java.util.Date;

import org.cometd.bayeux.server.ServerMessage;
import org.cometd.bayeux.server.ServerSession;
import org.cometd.bayeux.server.BayeuxServer;
import org.cometd.bayeux.server.ServerMessage.Mutable;

public class CowebExtension implements BayeuxServer.Extension {
	
	private PrintWriter outgoing = null;
	private PrintWriter incoming = null;
	
	public CowebExtension() {
        /*
		try {
			Date d = new Date();
			
			File out = new File("/tmp/outgoing_"+d.toString()+".txt");
			out.createNewFile();
			
			File in = new File("/tmp/incoming_"+d.toString()+".txt");
			in.createNewFile();
			
			this.outgoing = new PrintWriter(out);
			this.incoming = new PrintWriter(in);
		} catch (Exception e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	    */	
	}

	@Override
	public boolean rcv(ServerSession client, Mutable msg) {
		//this.incoming.println(msg.toString());
		//this.incoming.flush();
		return true;
	}

	@Override
	public boolean rcvMeta(ServerSession client, Mutable msg) {
		//System.out.println("CowebExtension::rcvMeta");
		//System.out.println(arg1);
		//super.rcvMeta(arg0, arg1);
		
		return true;
	}

	@Override
	public boolean sendMeta(ServerSession arg0, Mutable msg) {
		//System.out.println("CowebExtension::sendMeta");
		
		return true;
	}

	@Override
	public boolean send(ServerSession from, ServerSession to, ServerMessage.Mutable msg) {
	
		//System.out.println("CowebExtension::send");
		//this.outgoing.println(msg.toString());
		//this.outgoing.flush();
		return true;
	}

}
