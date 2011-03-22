//
// Unmanaged OpenAjax Hub implementation of the ListenerInterface.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*global define*/
define([
    'coweb/topics',
    'coweb/jsoe/OperationEngine',
    'org/OpenAjax'
], function(topics, OperationEngine, OpenAjax) {    
    // purge interval constants
    var SYNC_INTERVAL = 10000;
    var PURGE_INTERVAL = 10000;
    
    /**
     * @constructor
     */
    var UnmanagedHubListener = function() {
        // make sure we don't listen to our own messages
        this._mutex = false;
        // operation engine
        this._engine = null;
        // should purge if we've received a sync
        this._shouldPurge = false;
        // should sync if we've received a sync and have been quiet
        this._shouldSync = false;

        // timer references
        this._syncTimer = null;
        this._purgeTimer = null;

        // reference to the listener bridge
        this._bridge = null;
        // whether collaborative messages should be sent or not
        this._collab = false;
        // hub connections
        this._conns = [];
    };
    // save the finger joints
    var proto = UnmanagedHubListener.prototype;

    /**
     * Starts listening for cooperative events on the OpenAjax Hub to forward
     * to the session.
     *
     * @param {Object} bridge Session interface for the listener
     * @param {Object} prepResponse Prepare response from the coweb server
     */
    proto.start = function(bridge, prepResponse) {
        this._bridge = bridge;
        this._subscribeHub(prepResponse.collab);
        
        // set op engine timers as heartbeat, but only if collaborative
        if(prepResponse.collab) {
            // clear old timers
            if(this._syncTimer) {clearInterval(this._syncTimer);}
            if(this._purgeTimer) {clearInterval(this._purgeTimer);}
            // start async callbacks for purge and sync checks
            var self = this;
            this._syncTimer = setInterval(function() {
              self._engineSyncOutbound();      
            }, SYNC_INTERVAL);
            this._purgeTimer = setInterval(function() {
                self._onPurgeEngine();
            }, PURGE_INTERVAL);
        }
        
        // notify ready for coweb events
        var roster = this._bridge.getInitialRoster();
        var value = {
            username : prepResponse.username,
            site : this._engine.siteId,
            roster : roster
        };
        OpenAjax.hub.publish(topics.READY, value);
    };

    /**
     * Stops listening for cooperative events on the OpenAjax Hub to forward
     * to the session. Sends notification that the app is leaving the session.
     *
     * @param {Boolean} isDisconnected True if already disconnected from the
     * session or false if still connected
     */
    proto.stop = function(isDisconnected) {
        if(this._bridge) {
            // broadcast a final hub event indicating the client is now leaving
            // the conference if it was ever fully joined to the conference
            try {
                var value = {connected : !isDisconnected};
                OpenAjax.hub.publish(topics.END, value);
            } catch(e) {
                console.warn('UnmanagedHubListener: failed end session notice ' +
                    e.message);
            }
        }
        this._bridge = null;
        if(this._syncTimer) {
            clearInterval(this._syncTimer);
            this._syncTimer = null;
        }
        if(this._purgeTimer) {
            clearInterval(this._purgeTimer);
            this._purgeTimer = null;
        }
        this._unsubscribeHub();
    };

    /**
     * Called by the init method to subscribe to service bot, state, and sync
     * topics. Only subscribes to state and sync topics if collab is true.
     * 
     * @private
     * @param {Boolean} collab True to enable state and sync topics, false to 
     * listen to service events only
     */
    proto._subscribeHub = function(collab) {
        var conn;
        if(collab) {
            // listen for all incremental sync messages
            conn = OpenAjax.hub.subscribe(topics.SYNC+"**",
                '_syncOutbound', this);
            this._conns.push(conn);
            // listen for all full state reply messages
            conn = OpenAjax.hub.subscribe(topics.SET_STATE+"**",
                '_stateOutbound', this);
            this._conns.push(conn);
        }
        // listen for all subscription requests
        conn = OpenAjax.hub.subscribe(topics.SUB_SERVICE+"**",
            '_onSubServiceOutbound', this);
        this._conns.push(conn);
        // listen for all subscription cancelations
        conn = OpenAjax.hub.subscribe(topics.UNSUB_SERVICE+"**",
            '_onUnsubServiceOutbound', this);
        this._conns.push(conn);
        // listen for all get requests
        conn = OpenAjax.hub.subscribe(topics.GET_SERVICE+"**",
            '_onRequestServiceOutbound', this);
        this._conns.push(conn);
    };

    /**
     * Unsubscribe this listener from all Hub topics.
     *
     * @private
     */
    proto._unsubscribeHub = function() {
        for(var i=0, l=this._conns.length; i < l; i++) {
            OpenAjax.hub.unsubscribe(this._conns[i]);
        }
        this._conns = [];
    };

    /**
     * Called by the session to set the unique ID for this site in the active 
     * session. Used to initialize the op engine.
     *
     * @param {Number} id Unique integer ID for this site in the session
     */
    proto.setSiteID = function(id) {
        //console.debug('UnmanagedHubListener.setSiteID', id);
        this._engine = new OperationEngine(id);
        // siteid 0 is reserved, we duplicate the local site's cv in that slot
        this._engine.freezeSite(0);
    };

    /**
     * Called by the session when a coweb event is received from a remote app
     * or service bot. Processes the data in the local operation engine if 
     * required before publishing it on the local Hub. Takes special action for
     * engine sync topics to ensure the op engine remains in a valid state.
     *
     * @param {String} topic Topic name (topics.SYNC.**)
     * @param {Object} msg Received cooperative event or error message
     * @param {Number} site Unique integer ID of the sending site
     * @param {String} msgType String 'result' for data or 'error' for 
     * error message
     */
    proto.syncInbound = function(topic, msg, site, msgType) {
        //console.debug("UnmanagedHubListener.syncInbound:", topic, msg, site);        
        var value, type, position, cv;
        if(site !== 0) {
            // message from another client
            value = msg.value || null;
            type = msg.type || null;
            position = msg.position || 0;
            cv = msg.context || null;
        } else {
            // message from service
            value = msg;
            type = null;
            position = 0;
            cv = null;
        }

        // don't try to transform anything that doesn't have a context vector
        // just let it pass...
        if(cv !== null && type !== null) {
            if(topic === topics.ENGINE_SYNC) {
                // handle engine sync events here in the listener
                this._engineSyncInbound(site, cv);
                // and then quit; no one else should get syncs
                return;
            }

            // process the remote event in the engine
            var op;
            try {
                op = this._engine.push(false, topic, value, type, position, 
                    site, cv);
            } catch(e) {
                console.warn('UnmanagedHubListener: failed to push op into engine' + e.message);
                // @todo: we're out of sync now probably, fail the session?
                return;
            }
            // discard null operations; they should not be sent to gadget
            // according to op engine
            if(op === null) {return;}
            // use newly computed value and position
            value = op.value;
            position = op.position;
        }

        // all op engine processed events are JSON encoded; try to decode 
        // everything but ignore if failed because not encoded
        //if(typeof value === 'string') {
        try {
            value = JSON.parse(value);
        } catch(x) {}
        //}

        // package processed data as a hub event
        var event = {
            position : position,
            type : type,
            value : value,
            site : site,
            error : (msgType === 'error')
        };

        // publish on local hub
        this._mutex = true;
        try {
            OpenAjax.hub.publish(topic, event);
        } catch(z) {
            console.warn('UnmanagedHubListener: failed to deliver incoming event ' + topic + '(' + z.message + ')');
        }
        this._mutex = false;

        if(cv !== null) {
            // we've gotten data from elsewhere, so we should sync and/or purge
            // the engine on the next interval
            this._shouldPurge = true;
            this._shouldSync = true;
        }
    };

    /**
     * Called when an CollabInterface publishes a cooperative event on the 
     * local Hub. Processes the data in the local operation engine if required 
     * before forwarding it to the session.
     * 
     * @private
     * @param {String} topic Topic name (topics.SYNC.**)
     * @param {Object} publisherData Cooperative event to send
     */
    proto._syncOutbound = function(topic, publisherData) {
        // if the mutex is held, we're broadcasting and shouldn't be 
        // getting any additional events back, EVER!
        // (all other events will be generated by the same broadcast 
        // at other locations so we NEVER have to ship them)
        // assumes synchronous hub operation
        // stop now if we have no engine
        if(this._mutex || !this._engine) {
            return;
        }

        //console.debug("UnmanagedHubListener._syncOutbound:", topic, publisherData);

        // unpack event data to create an operation
        var position = publisherData.position;
        var type = publisherData.type;
        var value = publisherData.value;
        var op = null;
        var context = null;
        if(type !== null) {   
            // be sure to encode before pushing into op engine to avoid
            // changes to operation value stored in the history
            value = JSON.stringify(publisherData.value);
            // build operation
            try {
                op = this._engine.createOp(true, topic, value, type, position);
                context = op.contextVector.sites;
            } catch(e) {
                console.warn('UnmanagedHubListener: bad type "'+type+'" on outgoing event; making null');
                type = null;
            }   
        }
        
        var msg = {
           value : value,
           type : type,
           position: position,
           context : context
        };

        // post to client
        var sent, err;
        try {
            sent = this._bridge.postSync(topic, msg);
        } catch(x) {
            // ignore if can't post
            err = x;
            sent = false;
            console.warn('UnmanagedHubListener: failed to send hub event ' + 
                x.message);
        }
        if(sent && type !== null) {
            // add local event to engine, but only if it was really sent
            // yes, the local state changed, but it's better to keep the
            // context vector in the engine consistent than to track an
            // event we never sent
            this._engine.pushLocalOp(op);
            // we have to allow purges after sending even one event in 
            // case this site is the only one in the conf for now
            this._shouldPurge = true;
        } else if(err) {
            // throw error back to the caller
            throw err;
        }
    };
    
    /**
     * Called by the session when a roster notice arrives. Converts the notice 
     * to a Hub event and broadcasts it on the local Hub. Updates the sites
     * tracked by the op engine.
     *
     * @param {String} type 'available', 'unavailable'
     * @param {Number} roster.site Integer site ID affected
     * @param {String} roster.username Authenticated username at the site
     */
    proto.noticeInbound = function(type, roster) {
        var topic, event = {};

        // build event object
        event.site = roster.siteId;
        event.username = roster.username;
        if(type === 'available') {
            // joining user
            topic = topics.SITE_JOIN;
            // thaw the slot in the engine so the new site's cv is tracked
            //   properly
            try {
                this._engine.thawSite(event.site);
            } catch(e) {
                console.warn('UnmanagedHubListener: failed to thaw site ' + 
                    event.site + ' ' + e.message);
                // @todo: op engine died, exit session?
            }
        } else if(type === 'unavailable') {
            // leaving user
            topic = topics.SITE_LEAVE;
            // freeze the slot in the engine so garbage collection can continue
            //   unabated now that the site is gone
            try {
                this._engine.freezeSite(event.site);
            } catch(x) {
                console.warn('UnmanagedHubListener: failed to freeze site ' + 
                    event.site + ' ' + x.message);
                // @todo: op engine died, exit session?
            }
        }

        // publish on local hub
        this._mutex = true;
        try {
            OpenAjax.hub.publish(topic, event);
        } catch(z) {
            console.warn('UnmanagedHubListener: failed to deliver notice ' + 
                z.message);
        }
        this._mutex = false;
    };

    /**
     * Called when a CollabInterface instance subscribes to a service.
     * Forwards the request to the session.
     * 
     * @private
     * @param {String} topic Topic name (topics.SUB_SERVICE.**)
     * @param {Object} publisherData Object topic value
     */
    proto._onSubServiceOutbound = function(topic, publisherData) {
        //console.debug("UnmanagedHubListener._onSubServiceOutbound:", topic, publisherData);
        try {
            this._bridge.postServiceSubscribe(publisherData.service);
        } catch(e) {
            console.warn('UnmanagedHubListener: failed service subscribe ' + 
                e.message);
        }    
    };


    /**
     * Called when a CollabInterface instance unsubscribes from a service.
     * Forwards the request to the session.
     * 
     * @private
     * @param {String} topic Topic name (topics.UNSUB_SERVICE.**)
     * @param {Object} publisherData Object topic value
     */
    proto._onUnsubServiceOutbound = function(topic, publisherData) {
        //console.debug("UnmanagedHubListener._onUnsubServiceOutbound:", topic, publisherData);
        try {
            this._bridge.postServiceUnsubscribe(publisherData.service);
        } catch(e) {
            console.warn('UnmanagedHubListener: failed service unsub ' + 
                e.message);
        }
    };

    /**
     * Called when a CollabInterface instance posts a request to a service.
     * Forwards the request to the session.
     * 
     * @private
     * @param {String} topic Topic name (topics.GET_SERVICE.**)
     * @param {Object} publisherData Object topic value
     */
    proto._onRequestServiceOutbound = function(topic, publisherData) {
        // console.debug("UnmanagedHubListener._onRequestServiceOutbound:", topic, publisherData);
        try {
            this._bridge.postServiceRequest(publisherData.service,
                publisherData.params, publisherData.topic);
        } catch(e) {
            console.warn('UnmanagedHubListener: failed service request ' + 
                e.message);
        }
    };

    /**
     * Called by the session to retrieve the full state of the local 
     * application to seed a new app instance joining the session. Broadcasts
     * a request for state on the local Hub (topics.GET_STATE) and collects 
     * state directly from the op engine (topics.ENGINE_STATE). Sends an 
     * end state (topics.END_STATE) sentinel after publishing all requests as 
     * this impl of the Hub is synchronous.
     *
     * @param {String} recipient Token that all responses with application 
     * state must include to pair with the original request
     */
    proto.requestStateInbound = function(recipient) {
        //console.debug("UnmanagedHubListener.requestState:", recipient);

        // ask all gadgets for their state
        try {
            OpenAjax.hub.publish(topics.GET_STATE, recipient);
        } catch(e) {
            // @todo: really want to send error back to requester that this
            // site can't send state; for now, just log error and continue
            console.warn('UnmanagedHubListener: failed collecting state ' + 
                e.message);
        }

        // NOTE: continuing here only works because we're synchronous...
        // purge the operation engine to shrink the data sent
        var state;
        try {
            this._engine.purge();
            // get the state of the operation engine
            state = this._engine.getState();
        } catch(x) {
            // @todo: really want to send error back to requester that this
            // site can't send state; for now, just log error and continue
            console.warn('UnmanagedHubListener: failed collecting engine state ' + 
                x.message);
        }

        try {
            // post engine state
            this._bridge.postStateResponse(topics.ENGINE_STATE, state, 
                recipient);
        } catch(y) {
            // ignore if can't post
            console.warn('UnmanagedHubListener: failed sending engine state ' + 
                y.message);
        }

        try {
            // indicate done collecting state
            this._bridge.postStateResponse(topics.END_STATE, null, recipient);
        } catch(z) {
            // ignore if can't post
            console.warn('UnmanagedHubListener: failed sending end state ' + 
                z.message);
        }
    };

    /**
     * Called when a CollabInterface instance responds with a portion of the
     * current application state. Forwards the state to the session.
     *
     * @private
     * @param {String} topic Topic name (topics.SET_STATE)
     * @param {Object} publisherData.state Arbitrary app state
     * @param {Object} publisherData.token Token from the state request
     */
    proto._stateOutbound = function(topic, publisherData) {
        //console.debug('UnmanagedHubListener._onState', topic);
        // don't listen to state we just sent
        if(this._mutex) {
            return;
        }

        // pull out data to send
        var recipient = publisherData.recipient;
        var msg = publisherData.state;

        // send message to client here
        try {
            // topic is always SET_STATE so state is applied at receiver
            // value is state JSON blob
            // type and position are unused, so just set them to defaults
            // recipient is whatever the client gave us initially
            this._bridge.postStateResponse(topic, msg, recipient);
        } catch(e) {
            // ignore if can't post
            console.warn('UnmanagedHubListener: failed to send state ' + 
                e.message);
        }
    };

    /**
     * Called by the session to foward state received from a remote application
     * instance to initialize the local app. Broadcasts received app state on
     * the local Hub and passes op engine state directly to the local instance.
     *
     * @param {String} topic Topic name (topics.ENGINE_STATE, topics.SET_STATE)
     * @param {Object} state Arbitrary state
     */
    proto.stateInbound = function(topic, state) {
        //console.debug('UnmanagedHubListener.broadcastState', topic);
        if(topic === topics.ENGINE_STATE) {
            // handle engine state
            try {
                this._engine.setState(state);
            } catch(e) {
                console.warn('UnmanagedHubListener: failed to receive engine state ' + 
                    e.message);
                // @todo: engine dead, should exit session
                throw e;
            }
        } else {
            // handle gadget state
            // lock mutex so we don't publish anything after setting state
            this._mutex = true;
            try {
                // publish state for a gadget to grab
                OpenAjax.hub.publish(topic, state);
            } catch(x) {
                console.warn('UnmanagedHubListener: failed to initialize state ' + 
                    x.message);
                throw x;
            } finally {
                this._mutex = false;
            }
        }
    };

    /**
     * Called on a timer to send the local op engine context vector to other
     * participants (topics.ENGINE_SYNC) if the local op engine processed
     * received events since since the last time the timer fired.
     */
    proto._engineSyncOutbound = function() {
        if(!this._engine || !this._shouldSync) {return;}
        // console.debug('UnmanagedHubListener._engineSyncOutbound');
        // get engine context vector
        var cv = this._engine.copyContextVector();
        // JSON encode just the context for transmission
        var msg = {
            value : '',
            type : 'update',
            position: 0,
            context : cv.sites
        };
        try {
            this._bridge.postSync(topics.ENGINE_SYNC, msg);
        } catch(e) {
            // ignore if can't post
            console.warn('UnmanagedHubListener: failed to send engine sync ' + 
                e.message);
            return;
        }
        this._shouldSync = false;
    };
    
    /**
     * Called when the listener receives a context vector from a remote op
     * engine (topics.ENGINE_SYNC). Integrates the context vector into context
     * vector table of the local engine. Sets a flag saying the local op engine
     * should run garbage collection over its history. 
     */
    proto._engineSyncInbound = function(site, sites) {
        //console.debug('UnmanagedHubListener._onRecvEngineSync: site =', site, 'cv =', sites);
        // give the engine the data
        try {
            this._engine.pushSyncWithSites(site, sites);
        } catch(e) {
            console.warn('UnmanagedHubListener: failed to recv engine sync ' + 
                site + ' ' + sites + ' ' + e.message);
        }
        // we've received remote info, allow purge
        this._shouldPurge = true;
    };

    /**
     * Called on a timer to purge the local op engine history buffer if the
     * op engine received a remote event or context vector since the last time
     * the timer fired.
     */
    proto._onPurgeEngine = function() {
        if(!this._engine) {return;}
        var size;
        if(this._shouldPurge) {
            size = this._engine.getBufferSize();
            //var time = new Date();
            try {
                var mcv = this._engine.purge();
            } catch(e) {
                console.warn('UnmanagedHubListener: failed to purge engine ' + 
                    e.message);
            }
            //time = new Date() - time;
            //size = this._engine.getBufferSize();
            // console.debug('UnmanagedHubListener: purged size =', 
            // size, 'time =', time, 'mcv =', 
            // (mcv != null) ? mcv.toString() : 'null');
        }
        // reset flag
        this._shouldPurge = false;
        return size;
    };
    
    return UnmanagedHubListener;
});