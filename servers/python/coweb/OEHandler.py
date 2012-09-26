
import cowebpyoe.ContextVector;
import cowebpyoe.Operation;
import cowebpyoe.OperationEngine;
import cowebpyoe.OperationEngineException;

class OEHandler:

    def __init__(self, sessionHandler, siteId):
        self.sessionHandler = sessionHandler
        self.engine = OperationEngine(siteId)
        self.engine.freezeSite(0);

        self.shouldSync = False
        self.shoudPurge = False

        """
        this.purgeTimer = new Timer();
        this.purgeTask = new PurgeTask();
        this.purgeTimer.scheduleAtFixedRate(this.purgeTask, new Date(), 10000);

        this.syncTimer = new Timer();
        this.syncTask = new SyncTask();
        this.syncTimer.scheduleAtFixedRate(this.syncTask, new Date(), 10000);"""

     """
       Called by the session when a coweb event is received from a remote app.
       Processes the data in the local operation engine if required before
       publishing to the moderator.

       @param data Map containing the following.
              <li>String topic Topic name (topics.SYNC.**)
              <li>String value JSON-encoded operation value
              <li>String|null type Operation type
              <li>Integer position Operation linear position
              <li>Integer site Unique integer ID of the sending site
              <li>Integer[] sites Context vector as an array of integers 
                (use {@link OperationEngineHandler#getSites} to convert from Integer[] to int[])
    """
    def syncInbound(self, data):

        topic = data.get("topic", "")

        String value = null;
        if(data.get("value") instanceof String)
            value = (String)data.get("value");
        else {
            @SuppressWarnings("unchecked")
            Map<String, Object> val = (Map<String, Object>) data.get("value");
            if (val != null) {
                value = JSON.toString(val);
            }
        }


        _type = data.get("type", "")
        position = data.get("position", 0)
        site = data.geT("sideId", 0)
        order = data.get("order", 0)

        //get the sites array
        int[] sites = this.getSites(data);

        # push the operation onto the op engine.
        op = None
        if (sites != null && type != null) {
            try {
                op = this.engine.push(false, topic, value, type, position,
                        site, sites, order);
            } catch (OperationEngineException e) {
                // TODO Auto-generated catch block
                e.printStackTrace();
                return null;
            }

            if (op == null)
                return null;

            value = op.getValue();
            position = op.getPosition();
        } else if (site == this.engine.getSiteId()) {
            // op was echo'ed from server for op engine, but type null means
            // op engine doesn't care about this message anyway so drop it
            return null;
        }

        // value is always json-encoded to avoid ref sharing problems with ops
        // stored inside the op engine history buffer, so decode it and
        // pack it into a hub event
        HashMap<String, Object> hashMap = new HashMap<String, Object>();
        hashMap.put("position", new Integer(position));
        hashMap.put("type", type);
        hashMap.put("value", JSON.parse(value));
        hashMap.put("site", site);
        hashMap.put("channel", topic);

        this.shouldPurge = true;
        this.shouldSync = true;

        return hashMap;
    }

    /**
     * Called when the listener receives a context vector from a remote op
     * engine (topics.ENGINE_SYNC). Integrates the context vector into context
     * vector table of the local engine. Sets a flag saying the local op engine
     * should run garbage collection over its history.
     *
     * @param data Map containing the following.
     *        <li>Integer site Unique integer ID of the sending site
     *        <li>int[] sites Context vector as an array of integers
     */
    public void engineSyncInbound(Map<String, Object> data) {
        int[] sites = this.getSites(data);

        Integer ste = (Integer) data.get("siteId");
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

    private int[] getSites(Map<String, Object> data) {
        int[] sites = null;
        Object[] objArr = (Object[])data.get("context");
        if(objArr != null) {
            sites = new int[objArr.length];
            for(int i=0; i<objArr.length; i++)
                 sites[i] = ((Number)objArr[i]).intValue();
        }

        return sites;
    }

    /**
      * Wrapper for access to {@link org.coweb.oe.OperationEngine#getState}.
      *
      * @return engine state
      */
    public Object[] getEngineState() {
        return this.engine.getState();
    }

    /**
      * Called whenever the SessionHandler that owns this OperationEngineHandler is ending. All
      * TimerTasks are stopped from repeating.
      *
      * Only package level access.
      */
    void shutdown() {
        this.purgeTask.cancel();
        this.syncTask.cancel();
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
                /* Must convert to Integer[] from int[], because the receiver of this
                   message expects Integer[]. */
                int cnt = 0;
                int[] sites = cv.getSites();
                Integer[] arr = new Integer[sites.length];
                for (int i: sites)
                    arr[cnt++] = i;
                sessionHandler.postEngineSync(arr);
            } catch (OperationEngineException e) {
                // TODO Auto-generated catch block
                e.printStackTrace();
            }

            shouldSync = false;
        }
    }

}
