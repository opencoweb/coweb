//
// Unmanaged OpenAjax Hub implementation of the ListenerInterface.
// 
// @todo: doc cleanup throughout
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
define([
    'coweb/topics',
    'coweb/jsoe/OperationEngine'
], function(topics, jsoe) {
    // detect OpenAjax Hub 1.0
    var version;
    try {
        version = OpenAjax.hub.implVersion;
        if(version !== '1.0' && version !== '0.6') {
            throw new Error();
        }
    } catch(e) {
        // throw an error; need Hub for all of our implementations
        throw new Error('OpenAjax Hub 1.0 not loaded');
    }
    
    // purge interval constants
    var SYNC_INTERVAL = 10000;
    var PURGE_INTERVAL = 10000;
    
    var listener = function() {
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

        // reference to the session interface
        this._session = null;
        // reference to the listener bridge
        this._bridge = null;
        // whether collaborative messages should be sent or not
        this._collab = false;
        // hub connections
        this._conns = [];
    };

    /**
     * Called on page unload to remove client references.
     */
    listener.prototype.destroy = function() {
        this._session = null;
        this._bridge = null;
        if(this._syncTimer) {clearInterval(this._syncTimer);}
        if(this._purgeTimer) {clearInterval(this._purgeTimer);}
        this._unsubscribeHub();
    };
    
    /**
     * Stores a reference to the session that owns this listener.
     *
     * @param params Parameters created by the session factory function
     */
    listener.prototype.init = function(params) {
        this._session = params.session;
    };
    
    /**
     * Starts listening for cooperative events on the OpenAjax hub to forward
     * to the HubController.
     *
     * @param bridge Reference to the ListenerBridge
     * @param collab True to enable sync, state, and service events, false to 
     *   watch service events only
     */
    listener.prototype.start = function(bridge, collab) {
        this._bridge = bridge;
        this._subscribeHub(collab);
        
        // set op engine timers as heartbeat, but only if collaborative
        if(collab) {
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
    };

    /**
     * Stops listening for cooperative events on the OpenAjax hub to forward
     * to the HubController.
     */
    listener.prototype.stop = function() {
        this._bridge = null;
        if(this._syncTimer) {clearInterval(this._syncTimer);}
        if(this._purgeTimer) {clearInterval(this._purgeTimer);}
        this._unsubscribeHub();
    };

    /**
     * Called by the initm ethod to subscribe to service bot, state, and sync
     * topics. Only subscribes to state and sync topics if collab is true.
     * 
     * @param collab True to enable state and sync topics, false to listen to
     *   subscription events only
     */
    listener.prototype._subscribeHub = function(collab) {
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
     * Unsubscribe the listener from *all* Hub topics.
     */
    listener.prototype._unsubscribeHub = function() {
        for(var i=0, l=this._conns; i < l; i++) {
            OpenAjax.hub.unsubscribe(this._conns[i]);
        }
        this._conns = [];
    };

    /**
     * Called by the client to set a unique ID for this site in the active 
     * conference. Used to initialize the op engine.
     *
     * @param id Unique integer ID for this site in the current conference
     */
    listener.prototype.setSiteID = function(id) {
        //console.debug('listener.unmanaged.setSiteID', id);
        this._engine = new jsoe(id);
        // siteid 0 is reserved, we duplicate the local site's cv in that slot
        this._engine.freezeSite(0);
    };

    /**
     * Call to get the current site identifier in the active conference.
     *
     * @return Unique integer ID for this site in the current conference
     */
    listener.prototype.getSiteID = function() {
        return this._engine.siteId;
    };

    /**
     * Called by the ListenerBridge when a coweb event is received from a 
     * remote app or service bot. Processes the data in the local operation
     * engine if required before placing the data on the local Hub. Takes
     * special action for site join, site leave, and engine sync topics.
     *
     * @param topic String topic name (topics.SYNC.**)
     * @param msg Operation object associated with topic
     * @param site Unique integer ID of the originating site in the conference
     * @param msgType String 'result' for data or 'error' for service error, 
     *   nothing to do with operation type packed in the message
     */
    listener.prototype.syncInbound = function(topic, msg, site, msgType) {
        //console.debug("listener.unmanaged.syncInbound:", topic, msg, site);        
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
            if(topic == topics.ENGINE_SYNC) {
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
                console.warn('listener.unmanaged: failed to push op into engine' + e.message);
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
        //if(dojo.isString(value)) {
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
            console.warn('listener.unmanaged: failed to deliver incoming event ' + topic + '(' + z.message + ')');
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
     * Called to receive a incremental state change from the local Hub. 
     * Processes the data in the local operation engine if required before 
     * handing the data to the client for transmission.
     * 
     * @param topic String topic name (topics.SYNC.**)
     * @param publisherData Object topic value
     */
    listener.prototype._syncOutbound = function(topic, publisherData) {
        // if the mutex is held, we're broadcasting and shouldn't be 
        // getting any additional events back, EVER!
        // (all other events will be generated by the same broadcast 
        // at other locations so we NEVER have to ship them)
        // assumes synchronous hub operation
        // stop now if we have no engine
        if(this._mutex || !this._engine) {
            return;
        }

        //console.debug("listener.unmanaged._syncOutbound:", topic, publisherData);

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
                console.warn('listener.unmanaged: bad type "'+type+'" on outgoing event; making null');
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
        var sent;
        try {
            sent = this._bridge.postSync(topic, msg);
        } catch(x) {
            // ignore if can't post
            sent = false;
            console.warn('listener.unmanaged: failed to send hub event ' + x.message);
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
        }
    };
    
    /**
     * Called by the local client when a notice is received from the moderator
     * of the session about other clients. Converts the notice to a Hub event
     * and broadcasts it on the local Hub.
     *
     * @param type String 'available', 'unavailable', and 'info'
     * @param roster Object with {siteID : username, siteId : username ...}
     */
    listener.prototype.noticeInbound = function(type, roster) {
        var topic, event = {};
        var att, rosterArr = [];

        // build event object
        event.site = roster.siteId;
        event.username = roster.username;
        if(type == 'available') {
            // joining user
            topic = topics.SITE_JOIN;
            // thaw the slot in the engine so the new site's cv is tracked
            //   properly
            try {
                this._engine.thawSite(event.site);
            } catch(e) {
                console.warn('listener.unmanaged: failed to thaw site ' + event.site + ' ' + e.message);
            }
        } else if(type == 'unavailable') {
            // leaving user
            topic = topics.SITE_LEAVE;
            // freeze the slot in the engine so garbage collection can continue
            //   unabated now that the site is gone
            try {
                this._engine.freezeSite(event.site);
            } catch(x) {
                console.warn('listener.unmanaged: failed to freeze site ' + event.site + ' ' + x.message);
            }
        }

        // publish on local hub
        this._mutex = true;
        try {
            OpenAjax.hub.publish(topic, event);
        } catch(z) {
            console.warn('listener.unmanaged: failed to deliver incoming notice ' + z.message);
        }
        this._mutex = false;
    };

    /**
     * Called to receive a service subscription request from the local Hub
     * and to post it to the client for transmission.
     * 
     * @param topic String topic name (topics.SUB_SERVICE.**)
     * @param publisherData Object topic value
     */
    listener.prototype._onSubServiceOutbound = function(topic, publisherData) {
        //console.debug("HubListener._onSubServiceOutbound:", topic, publisherData);
        try {
            this._bridge.postServiceSubscribe(publisherData.service);
        } catch(e) {
            console.warn('listener.unmanaged: failed to subscribe to service');
        }    
    };

    /**
     * Called to receive a service unsubscribe request from the local Hub
     * and to post it to the client for transmission.
     * 
     * @param topic String topic name (topics.UNSUB_SERVICE.**)
     * @param publisherData Object topic value
     */
    listener.prototype._onUnsubServiceOutbound = function(topic, publisherData) {
        //console.debug("HubListener._onUnsubServiceOutbound:", topic, publisherData);
        try {
            this._bridge.postServiceUnsubscribe(publisherData.service);
        } catch(e) {
            console.warn('listener.unmanaged: failed to send unsub request ' + e.message);
        }
    };

    /**
     * Called to receive a service get request from the local Hub
     * and to post it to the client for transmission.
     * 
     * @param topic String topic name (topics.GET_SERVICE.**)
     * @param publisherData Object topic value
     */
    listener.prototype._onRequestServiceOutbound = function(topic, publisherData) {
        //console.debug("HubListener._onGetService:", topic, publisherData);
        try {
            this._bridge.postServiceRequest(publisherData.service,
                publisherData.params, publisherData.topic);
        } catch(e) {
            // ignore if can't post
            console.warn('listener.unmanaged: failed to send unsub request ' + e.message);
        }
    };

    /**
     * Called by the local client to request full state from all gadgets on
     * the page via the local Hub (topics.GET_STATE) and collects state 
     * directly from the operationengine (topics.ENGINE_STATE). Sends an 
     * end state sentinel after requesting gadget state and collecting engine 
     * state (topics.END_STATE).
     *
     * @param recipient Opaque value that all responders should provide with
     *   state data to distinguish concurrent requests for state
     */
    listener.prototype.requestStateInbound = function(recipient) {
        //console.debug("HubListener.requestState:", recipient);

        // ask all gadgets for their state
        try {
            OpenAjax.hub.publish(topics.GET_STATE, recipient);
        } catch(e) {
            // @todo: really want to send error back to requester that this
            // site can't send state; for now, just log error and continue
            console.warn('listener.unmanaged: failed collecting gadget state ' + e.message);
        }

        // NOTE: continuing here only works because we're synchronous...
        // purge the operation engine to shrink the data sent as much as possible
        var state;
        try {
            this._engine.purge();
            // get the state of the operation engine
            state = this._engine.getState();
        } catch(x) {
            // @todo: really want to send error back to requester that this
            // site can't send state; for now, just log error and continue
            console.warn('listener.unmanaged: failed collecting engine state ' + x.message);
        }

        try {
            // post engine state
            this._bridge.postStateResponse(topics.ENGINE_STATE, state, recipient);
        } catch(y) {
            // ignore if can't post
            console.warn('listener.unmanaged: failed sending operation engine state ' + y.message);
        }

        try {
            // indicate done collecting state
            this._bridge.postStateResponse(topics.END_STATE, null, recipient);
        } catch(z) {
            // ignore if can't post
            console.warn('listener.unmanaged: failed sending end state ' + z.message);
        }
    };

    /**
     * Called to receive full state from a gadget in response to a previous
     * state request from the client. Forwards the state to the client.
     *
     * @param topic String topic name (topics.SET_STATE)
     * @param publisherData Object with the opaque recipient value and the
     *   state of the gadget to be sent to the recipient
     */
    listener.prototype._stateOutbound = function(topic, publisherData) {
        //console.debug('HubListener._onState', topic);
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
            console.warn('listener.unmanaged: failed to send requested gadget state ' + e.message);
        }
    };

    /**
     * Called by the local client to foward state received from another
     * client to gadgets on this page via the Hub or to provide operation
     * engine state directly to the local engine instance.
     *
     * @param topic String topic name (topics.ENGINE_STATE,
     *   topics.SET_STATE)
     * @param state Object state value
     */
    listener.prototype.stateInbound = function(topic, state) {
        //console.debug('HubListener.broadcastState', topic);
        if(topic == topics.ENGINE_STATE) {
            // handle engine state
            try {
                this._engine.setState(state);
            } catch(e) {
                console.warn('listener.unmanaged: failed to process received engine state, ' + e.message);
                //throw e;
            }
        } else {
            // handle gadget state
            // lock mutex so we don't publish anything after setting state
            this._mutex = true;
            try {
                // publish state for a gadget to grab
                OpenAjax.hub.publish(topic, state);
            } catch(x) {
                console.warn('listener.unmanaged: failed handle received state, ' + x.message);
                throw x;
            } finally {
                this._mutex = false;
            }
        }
    };

    /**
     * Called on a timer to send an engine context vector to other participants
     * (topics.ENGINE_SYNC). Always fires, even if there are no changes
     * to the op engine state so that the moderator knows this client is still
     * alive.
     */
    listener.prototype._engineSyncOutbound = function() {
        if(!this._engine || !this._shouldSync) {return;}
        //console.debug('HubListener._onSendEngineSync');
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
            console.warn('listener.unmanaged: failed to send engine sync ' + e.message);
            return;
        }
        this._shouldSync = false;
    };
    
    /**
     * Called when the listener receives a sync event from a remote engine
     * (topics.ENGINE_SYNC).
     */
    listener.prototype._engineSyncInbound = function(site, sites) {
        //console.debug('HubListener._onRecvEngineSync: site =', site, 'cv =', sites);
        // give the engine the data
        try {
            this._engine.pushSyncWithSites(site, sites);
        } catch(e) {
            console.warn('listener.unmanaged: failed to push engine sync ' + site + ' ' + sites + ' ' + e.message);
        }
        // we've received remote info, allow purge
        this._shouldPurge = true;
    };

    /**
     * Called on a timer to purge the local engine history buffer.
     */
    listener.prototype._onPurgeEngine = function() {
        if(!this._engine) {return;}
        if(this._shouldPurge) {
            var size = this._engine.getBufferSize();
            //console.debug('HubListener._onPurgeEngine: size =', size);
            var time = new Date();
            try {
                var mcv = this._engine.purge();
            } catch(e) {
                console.warn('listener.unmanaged: failed to purge engine ' + e.message);
            }
            time = new Date() - time;
            size = this._engine.getBufferSize();
            //console.debug('> completed engine purge: size =', size, 'time =', time,
            //              'mcv =', (mcv != null) ? mcv.toString() : 'null');
        }
        // reset flag
        this._shouldPurge = false;
    };
    
    return listener;
});