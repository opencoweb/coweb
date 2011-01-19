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
 * @copyright IBM Corp. 2008, 2010 All Rights Reserved.
 */

public class ZipVisits implements Bot {

    private Proxy proxy = null;
    private HashMap<String, Object> markers = new HashMap<String, Object>();
    private Timer timer = null;

    public void setProxy(Proxy proxy) {
       this.proxy = proxy;
    }

   	@Override
	public void onSubscribe(String userName) {
		// TODO Auto-generated method stub

	}

	@Override
	public void onUnsubscribe(String userName) {
		// TODO Auto-generated method stub

	}
	
	@Override
	public void onShutdown() {
        if(this.timer != null)
        	this.timer.cancel();
	}
	
	@Override
	public void init() {
		// TODO Auto-generated method stub
		
	}

	@Override
	public void onRequest(Map<String, Object> arg0, String arg1, String arg2) {
		// TODO Auto-generated method stub
		
	}

    
    public void onSync(Map<String, Object> data, String username) {
        String topic = (String)data.get("topic");
        if(topic == null)
        	return;
   
        if(topic.startsWith("coweb.sync.marker")) {
            System.out.println("topic = " + topic);     
            System.out.println("ZipVisits::onSync");
            Map<Object, Object> evtData = (Map<Object, Object>)data.get("eventData");
            System.out.println(evtData);
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
	
/*
	def on_sync(self, data, username):
        # watch sync events for marker adds and moves
        if data['topic'].startswith('coweb.sync.marker.'):
            # explode topic name
            segs = data['topic'].split('.')
            # pull out action part of topic name
            action = segs[3]
            # pull out the marker id (based on known topic structure)
            mid = segs[4]
            # if we were doing real geocodes and visit lookup, we'd also pull
            # the lat/lng out of the event value and use that; here we just
            # fake data
            if action not in ['move', 'add']:
                return

            # start at some random value
            self.markers[mid] = random.randint(0, 1000)

            if self.timer is None:
                # start a timer to publish data every 5 sec
                self.timer = self.bot.add_timer(5, self.on_timer)
        
    def on_timer(self):
        # update counts for marker; if we weren't faking data, this is where
        # we'd go off a fetch the info
        for mid in self.markers:
            self.markers[mid] += random.randint(0, 10)
        # publish the updated results back to clients; include all the markers
        # but we could send just those that updated
        self.bot.publish(self.markers)
        # schedule next timer interval
        self.timer = self.bot.add_timer(5, self.on_timer)
        
    def on_shutdown(self):
        # make sure we're not hanging on a timer
        self.timer.cancel()
*/
