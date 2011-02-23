//
// Handles session joining and updating plus cooperative events over Bayeux.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*global define*/
define([
    'coweb/session/bayeux/cometd',
    'coweb/util/Promise',
    'coweb/topics'
], function(cometd, Promise, topics) {
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
        // /session/sync subscription
        this._syncToken = null;
        // local site id for filtering echo messages
        this._siteId = null;
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
        // update deferred
        this._updateDef = null;
        // messages queued during update
        this._updateQueue = [];
        // initial roster, cleared after first read of it
        this._roster = null;        
    };
    var proto = ListenerBridge.prototype;

    proto.postSync = function(topic, data) {
        // don't send events if we're not updated yet
        if(this._state !== this.UPDATED) { return; }
        // @todo: performance
        data = JSON.stringify(JSON.parse(data));
        // publish to server
        cometd.publish('/session/sync', {
            topic : topic, 
            eventData : data
        });
        return true;
    };
    
    proto.postStateResponse = function(topic, value, recipient) {
        var state = this._stateReqs[recipient];
        // no outstanding request for state, ignore this message
        if(state === undefined) { return; }
        if(topic !== topics.END_STATE) {
            // hold onto state
            // @todo: performance
            value = JSON.stringify(JSON.parse(value));
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
            eventData: params,
            topic : topic
        });
        // add topic to pending
        info.pending[topic] = true;
    };
    
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
    
    proto.initiateUpdate = function() {
        this._updateDef = new Promise();

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
            this._rosterToken = cometd.subscribe('/session/roster/*', 
                this, '_onSessionRoster');
            // subscribe to sync events
            this._syncToken = cometd.subscribe('/session/sync', 
                this, '_onSessionSync');
            // start the joining process
            this._joinToken = cometd.subscribe('/service/session/join/*', 
                this, '_onServiceSessionJoin');
        });
        
        return this._updateDef;
    };
    
    proto.getInitialRoster = function() {
        var r = this._roster;
        this._roster = null;
        return r;
    };
    
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
                        this._listener.syncInbound(topic, segs[2], 0, 'error');
                    }
                }
                // reset list of topics pending responses
                info.pending = {};
                return;
            }
            match = this._publicRegex.exec(ch);
            if(match) {
                // error subscribing to public bot channel
                topic = topics.SET_SERVICE + match[1];
                // toss the subscription token
                info = this._serviceSubs[match[1]];
                // remove local listener only, sub never happened on server
                cometd.removeListener(info.token);
                info.token = null;
                segs = msg.error.split(':');
                this._listener.syncInbound(topic, segs[2], 0, 'error');
                // @todo: do we need to unsubscribe? toss tokens?
                return;
            }
            // console.warn('bayeux.ListenerBridge: unhandled subscription error ' + msg.error);
        }
    };
    
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
                        this._listener.syncInbound(topic, segs[2], 0, 'error');
                    }
                }
                // reset list of topics pending responses
                info.pending = {};
                return;
            }
        }
    };

    proto._onServiceSessionJoin = function(msg) {
        // determine channel suffix
        var suffix = msg.channel.split('/');
        suffix = suffix[suffix.length-1];
        
        if(suffix === 'siteid') {
            this._siteId = msg.data;
            // tell listener about site ID
            this._listener.setSiteID(msg.data);
        } else if(suffix === 'roster') {
            // store initial roster until we're ready
            this._roster = msg.data;
        } else if(suffix === 'state') {
            // handle state messages
            var def = this._updateDef;
            this._updateDef = null;
            try {
                this._onServiceSessionJoinState(msg);
                // note updated
                def.resolve();
            } catch(e) {
                // note update failed
                def.fail(new Error('bad-application-state'));
            }
            // initialize the listener with the listener bridge reference
            this._listener.start(this, this._bridge.prepResponse);
        } else {
            // unknown message, ignore
            console.warn('bayeux.ListenerBridge: unknown message ' + msg.channel);
        }
    };

    proto._onServiceSessionJoinState = function(msg) {
        var i, l, item;
        // tell listener about state, one item at a time
        for(i=0, l=msg.data.length; i < l; i++) {
            item = msg.data[i];
            try {
                this._listener.stateInbound(item.topic, item.value);
            } catch(e1) {
                console.warn('bayeux.ListenerBridge: application errored on received state');
                throw e1;
            }
        }
        
        // process all queued events
        for(i=0, l=this._updateQueue.length; i < l; i++) {
            item = this._updateQueue[i];
            try {
                this[item.mtd](item.args);
            } catch(e2) {
                console.warn('bayeux.ListenerBridge: application errored on queued event');
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
    
    proto._onSessionSync = function(msg) {
        //console.debug('bayeux.ListenerBridge._onSessionSync:', msg);
        var d = msg.data;
        // ignore echo'ed messages
        if(d.siteId === this._siteId) {return;}
        if(this._state === this.UPDATING) {
            this._updateQueue.push({
                mtd : '_onSessionSync',
                args : msg
            });
            return;
        }
        this._listener.syncInbound(d.topic, d.eventData, d.siteId, 'result');        
    };
    
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
    
    proto._onServiceBotPublish = function(msg) {
        var ch = msg.channel;
        var match = this._publicRegex.exec(ch);
        if(!match) {
           console.warn('bayeux.ListenerBridge: unknown bot publish ' + ch);
           return;
        }
        var topic = topics.SET_SERVICE + match[1];
        this._listener.syncInbound(topic, msg.data.eventData, 0, 'result');
    };
    
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
        this._listener.syncInbound(topic, msg.data.eventData, 0, 'result');
    };
    
    return ListenerBridge;
});