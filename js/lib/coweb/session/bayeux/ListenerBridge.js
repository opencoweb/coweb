//
// Bridges the ListenerInterface to Bayeux/cometd.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*jslint white:false, bitwise:true, eqeqeq:true, immed:true, nomen:false, 
  onevar:false, plusplus:false, undef:true, browser:true, devel:true, 
  forin:false, sub:false*/
/*global define*/
define([
    'coweb/session/bayeux/cometd',
    'coweb/util/Promise',
    'coweb/util/lang'
], function(cometd, Promise, lang) {
    /**
     * @constructor
     * @param {Object} args.listener ListenerInterface instance
     * @param {Object} args.bridge SessionBridge instance
     */
    var ListenerBridge = function(args) {
        // constants
        this.IDLE = 0;
        this.UPDATING = 1;
        this.UPDATED = 2;
        
        // ListenerImpl
        this._listener = args.listener;
        // SessionImpl bridge 
        this._bridge = args.bridge;
        // /service/session/join/* subscription
        this._joinToken = null;
        // /session/roster/* subscription
        this._rosterToken = null;
        // /service/session/updater subscription
        this._updaterToken = null;
        // /session/sync/* subscription
        this._syncToken = null;
        // active requests for state
        this._stateReqs = {};
        // state of the join process
        this._state = this.IDLE;
        // service subscription tokens
        this._serviceSubs = {};
        // service request tokens
        this._serviceReqs = {};
        // public bot channel regex
        this._publicRegex = /^\/bot\/(.*)/;
        // private bot channel regex
        this._privateRegex = /^\/service\/bot\/([^\/]*)\/response/;
        // private bot channel regex
        this._requestRegex = /^\/service\/bot\/([^\/]*)\/request/;
        // update promise
        this._updatePromise = null;
        // messages queued during update
        this._updateQueue = [];
        // initial roster, cleared after first read of it
        this._roster = null;   
		
		this.syncChannel = '/session/sync/*';
		this.syncAppChannel = '/session/sync/app';
		this.syncEngineChannel = '/session/sync/engine';
		this.rosterChannel = "/session/roster/*";
    };
    var proto = ListenerBridge.prototype;


    /**
     * Publishes a local coweb event to the /session/sync Bayeux channel.
     *
     * @param {String} topic Event topic
     * @param {Object} value JSON-encodable event value
     * @param {String|null} type Event operation type
     * @param {Number} type Event integer linear position
     * @param {Number[]} context Event integer array context vector
     */
    proto.postSync = function(topic, value, type, position, context) {
        // don't send events if we're not updated yet
        if(this._state !== this.UPDATED) { return; }        
        // publish to server
        cometd.publish(this.syncAppChannel, {
            topic : topic, 
            value : value,
            type : type,
            position : position,
            context : context
        });
        return true;
    };
    
    /**
     * Publishes a local op engine sync event to the /session/sync Bayeux 
     * channel.
     *
     * @param {Number[]} context Integer array context vector for this site
     */
    proto.postEngineSync = function(context) {
        // don't send events if we're not updated yet
        if(this._state !== this.UPDATED) { return; }        
        // publish to server
        //cometd.publish('/service/session/sync/engine', {context : context});
		cometd.publish(this.syncEngineChannel, {context : context});
   
        return true;
    };

    /**
     * Publishes a local snapshot of the shared state to the 
     * /service/session/updater Bayeux channel.
     *
     * @param {String} topic String topic identifying the portion of the state
     * @param {Object} value JSON-encodable object
     * @param {String} recipient Opaque ID created by the server identifying
     * the recipient (i.e., late-joiner)
     */
    proto.postStateResponse = function(topic, value, recipient) {
        var state = this._stateReqs[recipient];
        // no outstanding request for state, ignore this message
        if(state === undefined) { return; }
        if(topic) {
            // hold onto state
            value = lang.clone(value);
            state.push({topic: topic, value: value});
        } else {
            state = {
                token: recipient,
                state: state
            };
            // send all state to server            
            cometd.publish('/service/session/updater', state);
            // stop tracking state request
            delete this._stateReqs[recipient];
        }
    };

    /**
     * Subscribes to the /bot/<name> Bayeux channel.
     *
     * @param {String} service Name of the service bot
     */
    proto.postServiceSubscribe = function(service) {
        var info = this._serviceSubs[service];
        if(!info) {
            // one time subscribe
            var token = cometd.subscribe('/bot/'+service, this,
                '_onServiceBotPublish');
            info = {count: 0, token: token};
            this._serviceSubs[service] = info;
        }
        // increment subscriber count
        info.count += 1;
    };
    
    /**
     * Subscribes to the /service/bot/<name>/response Bayeux channel
     * and then publishes a request to /service/bot/<name>/request.
     *
     * @param {String} service Name of the service bot
     * @param {Object} params JSON-encodable args to pass to the bot
     * @param {String} topic String topic name which the response should carry
     */
    proto.postServiceRequest = function(service, params, topic) {
        var info = this._serviceReqs[service];
        if(!info) {
            this._serviceReqs[service] = info = {token: null, pending: {}};
        }
        if(!info.token) {
            // one time subscribe for bot responses, unless error occurs
            var ch = '/service/bot/'+service+'/response';
            var token = cometd.subscribe(ch, this, '_onServiceBotResponse');
            info.token = token;
        }
        // check for conflict in pending topics
        if(info.pending[topic]) {
           console.warn('bayeux.ListenerBridge: conflict in bot request topics ' + topic);
           return;
        }
        // publish the bot request
        cometd.publish('/service/bot/'+service+'/request', {
            value: params,
            topic : topic
        });
        // add topic to pending
        info.pending[topic] = true;
    };
    
    /**
     * Unsubscribes to the /bot/<name> Bayeux channel.
     *
     * @param {String} service Name of the service bot
     */ 
    proto.postServiceUnsubscribe = function(service) {
        var info = this._serviceSubs[service];
        if(!info) {
            // ignore, nothing to unsub
            delete this._serviceSubs[service];
            return;
        }
        // decrement subscriber count
        info.count -= 1;
        if(info.count <= 0) {
            if(info.token) {
                // send an unsub to sever if the token is still valid
                cometd.unsubscribe(info.token);
            }
            delete this._serviceSubs[service];
        }
    };

    
    /**
     * Triggers the start of the procedure to update the local, late-joining 
     * app to the current shared session state. Subscribes to the roster, sync,
     * and join channels to tickle the server into sending a copy of the full
     * session state.
     *
     * @returns {Promise} Resolved after the app updates to the received state
     */
    proto.initiateUpdate = function() {
	
		//the session id to the channel names.
		this.syncChannel = '/session/'+this._bridge.prepResponse.sessionid+'/sync/*';
		this.syncAppChannel = '/session/'+this._bridge.prepResponse.sessionid+'/sync/app';
		this.syncEngineChannel = '/session/'+this._bridge.prepResponse.sessionid+'/sync/engine';
		this.rosterChannel = '/session/'+this._bridge.prepResponse.sessionid+'roster/*';
		
        this._updatePromise = new Promise();

        // start listening for subscribe responses so we can track subscription
        // failures
        cometd.addListener('/meta/subscribe', this, '_onSubscribe');
        // start listening for publish responses so we can track subscription
        // failures
        cometd.addListener('/meta/publish', this, '_onPublish');

        // go into updating state
        this._state = this.UPDATING;
        // empty the queue of held events
        this._updateQueue = [];
        // batch these subscribes
        cometd.batch(this, function() {
            // subscribe to roster list
            this._rosterToken = cometd.subscribe(this.rosterChannel, 
                this, '_onSessionRoster');
            // subscribe to sync events
            //this._syncToken = cometd.subscribe('/service/session/sync/*', 
			this._syncToken = cometd.subscribe(this.syncChannel, 
                this, '_onSessionSync');
            // start the joining process
            this._joinToken = cometd.subscribe('/service/session/join/*', 
                this, '_onServiceSessionJoin');
        });
        
        return this._updatePromise;
    };
    
    /**
     * Gets the initial session roster. Clears the store roster after 
     * retrieval.
     *
     * @returns {Object} Roster of site IDs paired with user names at the time
     * the local app started to update itself in the session
     */
    proto.getInitialRoster = function() {
        var r = this._roster;
        this._roster = null;
        return r;
    };
    
    /**
     * Called when the server responds to any /meta/subscribe request. Notifies
     * the listener of failures to subscribe to requested services.
     * 
     * @private
     * @param {Object} msg Subscribe response message
     */
    proto._onSubscribe = function(msg) {
        // check if bot subscribes were successful or not
        var topic, info, segs;
        if(!msg.successful) {
            var ch = msg.subscription;
            var match = this._privateRegex.exec(ch);
            if(match) {
                // error subscribing to private bot response channel 
                // toss the subscription token
                info = this._serviceReqs[match[1]];
                // remove local listener only, sub never happened on server
                cometd.removeListener(info.token);
                info.token = null;
                // pull out error tag
                segs = msg.error.split(':');
                // inform all callbacks of error
                for(topic in info.pending) {
                    if(info.pending.hasOwnProperty(topic)) {
                        this._listener.serviceResponseInbound(topic, segs[2], 
                            true);
                    }
                }
                // reset list of topics pending responses
                info.pending = {};
            }
            match = this._publicRegex.exec(ch);
            if(match) {
                // error subscribing to public bot channel
                // toss the subscription token
                info = this._serviceSubs[match[1]];
                // remove local listener only, sub never happened on server
                cometd.removeListener(info.token);
                info.token = null;
                segs = msg.error.split(':');
                this._listener.servicePublishInbound(match[1], segs[2], true);
                // @todo: do we need to unsubscribe? toss tokens?
            }
            // console.warn('bayeux.ListenerBridge: unhandled subscription error ' + msg.error);
        }
    };
    
    /**
     * Called when the server responds to any publish message. Notifies the
     * listener of failures to post requests to requested bot services.
     *
     * @private
     * @param {Object} msg Publish response message
     */
    proto._onPublish = function(msg) {
        if(!msg.successful) {
            var ch = msg.channel;
            var match = this._requestRegex.exec(ch);
            if(match) {
                // error sending private bot request
                // toss the subscription token
                var info = this._serviceReqs[match[1]];
                // remove local listener only, sub never happened on server
                cometd.removeListener(info.token);
                info.token = null;
                // pull out error tag
                var segs = msg.error.split(':');
                // inform all callbacks of error
                for(var topic in info.pending) {
                    if(info.pending.hasOwnProperty(topic)) {
                        this._listener.serviceResponseInbound(topic, segs[2], 
                            true);
                    }
                }
                // reset list of topics pending responses
                info.pending = {};
                return;
            }
        }
    };

    /**
     * Called when the server publishes on a /service/session/join/ Bayeux
     * channel. Handles siteid, roster, and full state messages, passing 
     * information to the listener as needed.
     *
     * @private
     * @param {Object} msg Published message
     */
    proto._onServiceSessionJoin = function(msg) {
        // determine channel suffix
        var suffix = msg.channel.split('/');
        suffix = suffix[suffix.length-1];
        
        if(suffix === 'siteid') {
            // tell listener about site ID
            this._listener.setSiteID(msg.data);
        } else if(suffix === 'roster') {
            // store initial roster until we're ready
            this._roster = msg.data;
        } else if(suffix === 'state') {
            // handle state messages
            var promise = this._updatePromise;
            this._updatePromise = null;
            try {
                this._onServiceSessionJoinState(msg);
            } catch(e) {
                // note update failed
                promise.fail(new Error('bad-application-state'));
            }
            // initialize the listener with the listener bridge reference
            this._listener.start(this, this._bridge.prepResponse);
            // note updated
            promise.resolve();
        } else {
            // unknown message, ignore
            console.warn('bayeux.ListenerBridge: unknown message ' + msg.channel);
        }
    };

    /**
     * Called when the server sends a portion of the full application state
     * to this late-joining app instance. Forwards the state to the listener
     * for broadcast to the app. If applied properly, forwards any queued 
     * events held during the update process. Finally, publishes a message to
     * the /service/session/updater channel indicating this app instance can
     * now provide state to other late joiners.
     *
     * @private
     * @param {Object} msg Published state message
     */
    proto._onServiceSessionJoinState = function(msg) {
        var i, l, item;
        // tell listener about state, one item at a time
        for(i=0, l=msg.data.length; i < l; i++) {
            item = msg.data[i];
            try {
                this._listener.stateInbound(item.topic, item.value);
            } catch(e1) {
                console.warn('bayeux.ListenerBridge: application errored on received state ' +
                    e1.message);
                throw e1;
            }
        }
        
        // process all queued events
        for(i=0, l=this._updateQueue.length; i < l; i++) {
            item = this._updateQueue[i];
            try {
                this[item.mtd](item.args);
            } catch(e2) {
                console.warn('bayeux.ListenerBridge: application errored on queued event ' +
                    e2.message);
                throw e2;
            }
        }

        cometd.batch(this, function() {
            // unsubscribe from joining channel
            cometd.unsubscribe(this._joinToken);
            this._joinToken = null;
            // subscribe as an updater
            this._updaterToken = cometd.subscribe('/service/session/updater', 
                this, '_onServiceSessionUpdater');
        });
        
        // join is done
        this._state = this.UPDATED;
        this._updateQueue = [];
    };

    /**
     * Called to handle a /session/sync/ message. Forwards it to the listener
     * for processing by the op engine and/or broadcast to the local app.
     *
     * @private
     * @param {Object} msg Published coweb event message
     */
    proto._onSessionSync = function(msg) {
        var d = msg.data;
        if(this._state === this.UPDATING) {
            this._updateQueue.push({
                mtd : '_onSessionSync',
                args : msg
            });
            return;
        }
        var ch = msg.channel.split('/');
        var sch = ch[ch.length-1];
        // post to listener
        if(sch === 'engine') {
            // engine sync
            this._listener.engineSyncInbound(d.siteId, d.context);
        } else if(sch === 'app') {
            // app event sync
            this._listener.syncInbound(d.topic, d.value, d.type, d.position, 
                d.siteId, d.context, d.order);
        } else {
            console.warn('bayeux.ListenerBridge: received unknown sync ' + ch);
        }
    };
    
    /**
     * Called to handle a /session/roster/ message. Forwards it to the 
     * listener for broadcast to the local application.
     *
     * @private
     * @param {Object} msg Published roster message
     */
    proto._onSessionRoster = function(msg) {
        if(this._state === this.UPDATING) {
            this._updateQueue.push({
                mtd : '_onSessionRoster',
                args : msg
            });
            return;
        }
        
        // determine channel suffix
        var suffix = msg.channel.split('/');
        suffix = suffix[suffix.length-1];
        
        if(suffix === 'available' || suffix === 'unavailable') {
            this._listener.noticeInbound(suffix, msg.data);
        } else {
            // ignore unknown message
            console.warn('bayeux.ListenerBridge: unknown message ' + msg.channel);
        }
    };
    
    /**
     * Called to handle a message on the /service/session/updater Bayeux 
     * channel. Requests the full state of the local app.
     *
     * @private
     * @param {Object} msg Published state request message
     */
    proto._onServiceSessionUpdater = function(msg) {
        // note on-going request for state
        var token = msg.data;
        this._stateReqs[token] = [];
        
        try {
            this._listener.requestStateInbound(token);
        } catch(e) {
            // @todo: force disconnect because state is bad
            this._bridge.onDisconnected(this._bridge.id, 'bad-application-state');
        }
    };
    
    /**
     * Called to handle a message on the /bot/<name> Bayeux channel. Forwards
     * the bot broadcast to the listener.
     *
     * @private
     * @param {Object} msg Published service bot message
     */
    proto._onServiceBotPublish = function(msg) {
        var ch = msg.channel;
        var match = this._publicRegex.exec(ch);
        if(!match) {
           console.warn('bayeux.ListenerBridge: unknown bot publish ' + ch);
           return;
        }
        var serviceName = match[1];
        this._listener.servicePublishInbound(serviceName, msg.data.value, 
            false);
    };

    /**
     * Called to handle a message on the /service/bot/<name>/response Bayeux 
     * channel. Forwards the private bot response to the listener.
     *
     * @private
     * @param {Object} msg Published service bot message
     */   
    proto._onServiceBotResponse = function(msg) {
        var ch = msg.channel;
        var topic = msg.data.topic;
        var match = this._privateRegex.exec(ch);    
        if(!match) {
           console.warn('bayeux.ListenerBridge: unknown bot response ' + ch);
           return;
        }
        // clean up tracked topic
        var info = this._serviceReqs[match[1]];
        // check topic match for good measure
        if(!info.pending[topic]) {
            console.warn('bayeux.ListenerBridge: unknown bot response ' + ch);
            return;
        }
        delete info.pending[topic];
        // send to listener
        this._listener.serviceResponseInbound(topic, msg.data.value, 
            false);
    };
    
    return ListenerBridge;
});