package org.coweb;

import java.util.Date;
import java.util.Map;
import java.util.Timer;
import java.util.TimerTask;
import java.util.logging.Logger;

import org.coweb.oe.ContextVector;
import org.coweb.oe.Operation;
import org.coweb.oe.OperationEngine;
import org.coweb.oe.OperationEngineException;
import org.eclipse.jetty.util.ajax.JSON;

public class OperationEngineHandler {
	
	private static final Logger log = Logger.getLogger(OperationEngineHandler.class.getName());

	// reference to operation engine.
	private OperationEngine engine = null;
	
	// reference to session handler.
	private SessionHandler sessionHandler = null;

	// should purge if we've received a sync
	private boolean shouldPurge = false;

	// should sync if we've received a sync and have been quiet
	private boolean shouldSync = false;
	
	private Timer purgeTimer = null;
	private Timer syncTimer = null;

	public OperationEngineHandler(SessionHandler sessionHandler, int siteId) throws OperationEngineException {
		
		this.sessionHandler = sessionHandler;
		
		//create the op engine.
		this.engine = new OperationEngine(siteId);
		this.engine.freezeSite(0);
		
		//schedule the purge thread.
		this.purgeTimer = new Timer();
		this.purgeTimer.scheduleAtFixedRate(new PurgeTask(), new Date(), 10000);
		
		//schedule the engine sync thread.
		this.syncTimer = new Timer();
		this.syncTimer.scheduleAtFixedRate(new SyncTask(), new Date(), 10000);
	}

	/**
     * Called by the session when a coweb event is received from a remote app.
     * Processes the data in the local operation engine if required before 
     * publishing to the moderator. 
     *
     * @param Map containing the following.
     *        String topic Topic name (topics.SYNC.**)
     *        String value JSON-encoded operation value
     *        String|null type Operation type
     *        Integer position Operation linear position
     *        Integer site Unique integer ID of the sending site
     *        int[] sites Context vector as an array of integers
     */
	public Map<String, Object> syncInbound(Map<String, Object> data)
			throws OperationEngineException {
		
		//get the topic
		String topic = (String) data.get("topic");
		
		//get the value
		@SuppressWarnings("unchecked")
		Map<String, Object> val = (Map<String, Object>) data.get("value");
		String value = null;
		if (val != null) {
			value = JSON.toString(val);
		}

		//get the type
		String type = (String) data.get("type");

		//get the position
		Integer pos = (Integer) data.get("position");
		int position = 0;
		if (pos != null)
			position = pos.intValue();

		//get the site
		Integer ste = (Integer) data.get("site");
		int site = 0;
		if (ste != null) {
			site = ste.intValue();
		}

		//get the sites array
		int[] sites = (int[]) data.get("sites");

		//get the order
		Integer ord = (Integer) data.get("order");
		int order = 0;
		if (ord != null)
			order = ord.intValue();

		//push the operation onto the op engine.
		Operation op = null;
		if (sites != null && type != null) {
			op = this.engine.push(false, topic, value, type, position,
					site, sites, order);

			if (op == null)
				return data;

			value = op.getValue();
			position = op.getPosition();
		} else if (site == this.engine.getSiteId()) {
			// op was echo'ed from server for op engine, but type null means
			// op engine doesn't care about this message anyway so drop it
			return data;
		}

		// value is always json-encoded to avoid ref sharing problems with ops
		// stored inside the op engine history buffer, so decode it and
		// pack it into a hub event
		data.put("position", new Integer(position));
		data.put("type", type);
		data.put("value", JSON.parse(value));
		data.put("site", site);

		return data;
	}
	
	/**
     * Called when the listener receives a context vector from a remote op
     * engine (topics.ENGINE_SYNC). Integrates the context vector into context
     * vector table of the local engine. Sets a flag saying the local op engine
     * should run garbage collection over its history. 
     * 
     * @param Map containing the following.
     *        Integer site Unique integer ID of the sending site
     *        int[] sites Context vector as an array of integers
     */
	public void engineSyncInbound(Map<String, Object> data) {
		int[] sites = (int[]) data.get("sites");
		Integer ste = (Integer) data.get("site");
		int site = -1;
		if (ste != null) {
			site = ste.intValue();
		}
		
		// ignore our own engine syncs
        if(site == this.engine.getSiteId()) {
        	return;
        }
        
        // give the engine the data
        try {
            this.engine.pushSyncWithSites(site, sites);
        } catch(OperationEngineException e) {
            log.info("UnmanagedHubListener: failed to recv engine sync " + 
                site + " " + sites + " " + e.getMessage());
        }
        // we've received remote info, allow purge
        this.shouldPurge = true;
	}
	
	/**
     * Called on a timer to purge the local op engine history buffer if the
     * op engine received a remote event or context vector since the last time
     * the timer fired.
     */
	class PurgeTask extends TimerTask {
		
		public void run() {
			if(engine == null)
				return;
			
			if(shouldPurge) {
				try {
					engine.purge();
				} catch (OperationEngineException e) {
					// TODO Auto-generated catch block
					e.printStackTrace();
				}
			}
			
			shouldPurge = false;	
		}
	}
	
	/**
     * Called on a timer to send the local op engine context vector to other
     * participants (topics.ENGINE_SYNC) if the local op engine processed
     * received events since since the last time the timer fired.
     */
	class SyncTask extends TimerTask {
		public void run() {
			if(!shouldSync || engine == null)
				return;
			
			try {
				ContextVector cv = engine.copyContextVector();
				sessionHandler.postEngineSync(cv.getSites());
			} catch (OperationEngineException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
			
			shouldSync = false;
		}
	}
}
