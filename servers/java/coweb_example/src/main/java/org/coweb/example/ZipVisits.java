/**
 * Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
 */
package org.coweb.example;

import org.coweb.bots.Bot;

import org.coweb.bots.Proxy;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Timer;
import java.util.TimerTask;
import java.util.Random;

/**
 * Bot class for the comap example. When a user adds a marker this bot
 * will see the sync event and start pushing markers to the session.
 */
public class ZipVisits implements Bot {

    private Proxy proxy = null;
    private HashMap<String, Object> markers = new HashMap<String, Object>();
    private Timer timer = null;

    public void setProxy(Proxy proxy) {
       this.proxy = proxy;
    }

	public void onSubscribe(String userName) {
        return;
	}

	public void onUnsubscribe(String userName) {
        return;
	}
	
	public void onShutdown() {
        if(this.timer != null)
        	this.timer.cancel();
	}
	
	public void init() {
        return;
	}

	public void onRequest(Map<String, Object> arg0, String arg1, String arg2) {
        return;
	}

   
    /**
     * Watch for sync events for marker adds and moves.
     */ 
    public void onSync(Map<String, Object> data, String username) {
        String topic = (String)data.get("topic");
        if(topic == null)
        	return;
   
        if(topic.startsWith("coweb.sync.marker")) {
            Map<Object, Object> evtData = 
                (Map<Object, Object>)data.get("eventData");

            //parse the topic field to find the item after 
            //coweb.sync.marker
        	String[] seqs = topic.split("\\.");
        	String action = seqs[3];
        	String mid = seqs[4];
        	
        	if(!action.equals("move") && !action.equals("add"))
        		return;
        	
        	Random r = new Random();
        	int m = r.nextInt(1000);
        	
        	this.markers.put(mid, new Integer(m));
        	
        	if(this.timer == null) {
        		this.timer = new Timer();
        		this.timer.scheduleAtFixedRate(new ZipTimer(this), 0, 5000);
        	}
        	
        }

    }
    
    private class ZipTimer extends TimerTask {
    	
        private ZipVisits b = null;
        
        ZipTimer(ZipVisits b) {
        	this.b = b;
        }
    	
		@Override
		public void run() {

			Random r = new Random();
			for(String mid : markers.keySet()) {
				int m = ((Integer)markers.get(mid)).intValue();
				m += r.nextInt(10);
				markers.put(mid, new Integer(m));
			}

            System.out.println("sending markers " + markers);    
			this.b.proxy.publish(this.b, markers);
		}
    }
}
