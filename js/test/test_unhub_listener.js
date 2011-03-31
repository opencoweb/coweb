//
// Tests the UnamangedHubListener implementation of ListenerInterface.
// 
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
//
/*global define module test raises deepEqual ok equal strictEqual*/
define([
    'coweb/listener/UnmanagedHubListener',
    'org/OpenAjax',
    'coweb/topics',
    'coweb/util/lang'
], function(UnmanagedHubListener, OpenAjax, topics, lang) {
    var modOpts = function(collab) {
        return {
            setup: function() {
                this.listener = new UnmanagedHubListener();
                this.listener.setSiteID(5);
                if(collab !== undefined) {
                    this.listener.start(bridge, {
                        collab : collab,
                        username : targets.localUsername
                    });
                }
                this._subs = [];
            },
            teardown: function() {
                this.listener.stop();
                delete this.listener;
                for(var i=0, l=this._subs.length; i<l; i++) {
                    OpenAjax.hub.unsubscribe(this._subs[i]);
                }
            },
        
            sub: function() {
                var tok = OpenAjax.hub.subscribe.apply(OpenAjax.hub, arguments);
                this._subs.push(tok);
                return tok;
            }
        };
    };

    // test targets
    var targets = {
        localSiteId : 5,
        localUsername : 'foo.bar',
        roster : {
            1 : 'john.doe',
            2 : 'jane.smith',
            4 : 'bob.watts'
        },
        syncTopic : topics.SYNC+'name.wid0',
        outSyncMsg : {
            value : 'abc',
            type : 'insert',
            position : 1
        },
        inSyncMsg : {
            value : JSON.stringify('abc'),
            type : 'insert',
            position : 1,
            context : [0,0,0,0,0,0]
        },
        inHubSyncMsg : {
            position : 1,
            type : 'insert',
            value : 'abc',
            site : 1
        },
        serviceName : 'somebot',
        serviceParams : {
            a : 'b',
            c : 'd'
        },
        serviceResponse : {
            e : 'f',
            g : 'h'
        },
        hubServiceResponse: {
            value : {
                e : 'f',
                g : 'h'
            },
            error : false
        },
        hubServiceError : {
            value : 'service error message',
            error : true
        },
        reqServiceTopic : topics.GET_SERVICE+'somebot_0.wid4',
        respServiceTopic : topics.SET_SERVICE+'somebot_0.wid4',
        pubServiceTopic : topics.SET_SERVICE+'somebot',
        stateMsg : {},
        stateRecipient : '123abc',
        engineState : [
            [
                [0,0,0,0,0,0],
                [0,0,0,0,0,0],
                [0,0,0,0,0,0],
                [0,0,0,0,0,0],
                [0,0,0,0,0,0],
                [0,0,0,0,0,0]
            ], 
            [], 
            5, 
            [0]
        ],
        engineSync : {
            value : '',
            type : 'update',
            position : 0,
            context :  [0,0,0,0,0,0]
        }
    };
    targets.stateMsg[topics.SET_STATE+'wid1'] = [1,2,3];
    targets.stateMsg[topics.SET_STATE+'wid2'] = [4,5];
    targets.stateMsg[topics.SET_STATE+'wid3'] = {6: 'seven'};    
    
    // mock bridge
    var bridge = {
        postSync: function(topic, value, type, position, context) {
            equal(topic, targets.syncTopic, 'sync topic');
            deepEqual(value, targets.inSyncMsg.value, 'sync value');
            deepEqual(type, targets.inSyncMsg.type, 'sync type');
            deepEqual(position, targets.inSyncMsg.position, 'sync position');
            deepEqual(context, targets.inSyncMsg.context, 'sync context');
            return true;
        },
        
        postEngineSync: function(context) {
            deepEqual(context, targets.engineSync.context, 'engine sync context');            
            return true;
        },
        
        getInitialRoster: function() {
            return targets.roster;
        },
        
        postServiceSubscribe: function(serviceName) {
            equal(serviceName, targets.serviceName);
        },
        
        postServiceUnsubscribe: function(serviceName) {
            equal(serviceName, targets.serviceName);
        },
        
        postServiceRequest: function(serviceName, params, topic) {
            equal(serviceName, targets.serviceName, 'service request name');
            deepEqual(params, targets.serviceParams, 'service request params');
            equal(topic, targets.reqServiceTopic, 'service request topic');
        },
        
        postStateResponse: function(topic, state, token) {
            equal(token, targets.stateRecipient, 'posted state token');
            if(topic === topics.ENGINE_STATE) {
                deepEqual(state, targets.engineState, 'engine state');
            } else if(topic === null) {
                equal(state, null, 'end state sentinel');
            } else {
                deepEqual(state, targets.stateMsg[topic], 'posted state');
            }
        }
    };
    
    module('listener bootstrap', modOpts());
    
    test('start collab', 3, function() {
        var self = this;
        this.sub(topics.READY, function(topic, info) {
            deepEqual(info, {
                roster : targets.roster,
                site : targets.localSiteId,
                username : targets.localUsername
            });
            ok(self.listener._syncTimer);
            ok(self.listener._purgeTimer);
        });
        this.listener.start(bridge, {
            collab : true, 
            username : targets.localUsername
        });
    });
    
    test('start services only', 3, function() {
        var self = this;
        this.sub(topics.READY, function(topic, info) {
            deepEqual(info, {
                roster : targets.roster,
                site : targets.localSiteId,
                username : targets.localUsername
            });
            ok(!self.listener._syncTimer);
            ok(!self.listener._purgeTimer);
        });
        this.listener.start(bridge, {
            collab : false, 
            username : targets.localUsername
        });
    });
    
    test('stop', 2, function() {
        this.listener.start(bridge, {
            collab : true,
            username : targets.localUsername
        });
        this.listener.stop();
        ok(!this.listener._syncTimer);
        ok(!this.listener._purgeTimer);
        // ensure ignoring events
        OpenAjax.hub.publish(targets.syncTopic, {});
    });

    module('listener', modOpts(true));

    test('inbound sync op', 3, function() {
        // subscribe to sync
        this.sub(targets.syncTopic, function(topic, msg) {
            equal(topic, targets.syncTopic);
            deepEqual(msg, targets.inHubSyncMsg);
        });
        // invoke inbound method
        this.listener.syncInbound(targets.syncTopic, targets.inSyncMsg.value,
            targets.inSyncMsg.type, targets.inSyncMsg.position, 1, 
            targets.inSyncMsg.context);
        // whitebox: ensure op engine processed event
        deepEqual(this.listener._engine.cv.sites, [0,1,0,0,0,0]);
    });

    test('inbound sync no-op', 3, function() {
        var inSyncMsg = lang.clone(targets.inSyncMsg),
            inHubSyncMsg = lang.clone(targets.inHubSyncMsg);
        inSyncMsg.type = null;
        inHubSyncMsg.type = null;
        
        // subscribe to sync
        this.sub(targets.syncTopic, function(topic, msg) {
            equal(topic, targets.syncTopic);
            deepEqual(msg, inHubSyncMsg);
        });
        // invoke inbound method
        this.listener.syncInbound(targets.syncTopic, inSyncMsg.value, 
            inSyncMsg.type, inSyncMsg.position, 1, inSyncMsg.context);
        // whitebox: ensure op engine did not process the event
        deepEqual(this.listener._engine.cv.sites, [0,0,0,0,0,0]);
    });
    
    test('outbound sync', 6, function() {
        // publish sync for listener to receive and bridge to check
        OpenAjax.hub.publish(targets.syncTopic, targets.outSyncMsg);
        // whitebox: ensure op engine processed the event
        deepEqual(this.listener._engine.cv.sites, [0,0,0,0,0,1]);
    });
    
    test('inbound notice', 4, function() {
        var join = {siteId: 3, username : 'pete.parkins'};
        var leave = {siteId : 1, username : 'john.doe'};
        this.sub(topics.SITE_JOIN, function(topic, msg) {
            equal(msg.site, join.siteId);
            equal(msg.username, join.username);
        });
        this.sub(topics.SITE_LEAVE, function(topic, msg) {
            equal(msg.site, leave.siteId);
            equal(msg.username, leave.username);
        });
        this.listener.noticeInbound('available', join);
        this.listener.noticeInbound('unavailable', leave);
    });
    
    test('inbound state request / response', 16, function() {
        var self = this;
        // subscribe to request
        for(var key in targets.stateMsg) {
            if(targets.stateMsg.hasOwnProperty(key)) {
                (function(id) {
                    self.sub(topics.GET_STATE, function(topic, msg) {
                        equal(topic, topics.GET_STATE, 'get state topic');
                        equal(msg, targets.stateRecipient, 'get state token');
                        var resp = {
                            state : targets.stateMsg[id],
                            recipient : targets.stateRecipient
                        };
                        OpenAjax.hub.publish(id, resp);
                    });
                })(key);
            }
        }
        this.listener.requestStateInbound(targets.stateRecipient);        
    });
    
    test('inbound state response', 7, function() {
        var self = this;
        // subscribe to response
        for(var key in targets.stateMsg) {
            if(targets.stateMsg.hasOwnProperty(key)) {
                (function(id) {
                    self.sub(id, function(topic, msg) {
                        equal(topic, id, 'set state topic');
                        deepEqual(msg, targets.stateMsg[id]);
                    });
                })(key);
                this.listener.stateInbound(key, targets.stateMsg[key]);
            }
        }
        // make sure no exceptions on engine state
        this.listener.stateInbound(topics.ENGINE_STATE, targets.engineState);
        // whitebox: make sure engine state is set
        deepEqual(this.listener._engine.getState(), targets.engineState);
    });
    
    test('outbound service subscribe', 1, function() {
        OpenAjax.hub.publish(topics.SUB_SERVICE+targets.serviceName, 
            {service : targets.serviceName});
    });

    test('outbound service unsubscribe', 1, function() {
        OpenAjax.hub.publish(topics.UNSUB_SERVICE+targets.serviceName, 
            {service : targets.serviceName});
    });

    test('outbound service request', 3, function() {
        OpenAjax.hub.publish(targets.reqServiceTopic, {
            service : targets.serviceName,
            topic : targets.reqServiceTopic,
            params : targets.serviceParams
        });
    });

    test('inbound service publish', 2, function() {
        this.sub(targets.pubServiceTopic, function(topic, msg) {
            equal(topic, targets.pubServiceTopic, 'service publish topic');
            deepEqual(msg, targets.hubServiceResponse, 'service publish value');
        });
        this.listener.servicePublishInbound(targets.serviceName, 
            targets.serviceResponse, false);
    });
    
    test('inbound service response', 2, function() {
        this.sub(targets.respServiceTopic, function(topic, msg) {
            equal(topic, targets.respServiceTopic, 'service response topic');
            deepEqual(msg, targets.hubServiceResponse, 'service response value');
        });
        this.listener.serviceResponseInbound(targets.respServiceTopic, 
            targets.serviceResponse, false);
    });
    
    test('inbound service response error', 2, function() {
        this.sub(targets.respServiceTopic, function(topic, msg) {
            equal(topic, targets.respServiceTopic, 'service error topic');
            deepEqual(msg, targets.hubServiceError, 'service error msg');
        });
        this.listener.serviceResponseInbound(targets.respServiceTopic, 
            targets.hubServiceError.value, true);
    });

    test('inbound service publish error', 2, function() {
        this.sub(targets.pubServiceTopic, function(topic, msg) {
            equal(topic, targets.pubServiceTopic, 'service error topic');
            deepEqual(msg, targets.hubServiceError, 'service error msg');
        });
        this.listener.serviceResponseInbound(targets.pubServiceTopic, 
            targets.hubServiceError.value, true);
    });

    test('outbound engine sync', 2, function() {
        this.listener._shouldSync = true;
        this.listener._engineSyncOutbound();
        ok(!this.listener._shouldSync);
    });

    test('inbound engine sync', 1, function() {
        var target = [1,2,3,4,5,6];
        this.listener.engineSyncInbound(2, target);
        var cvt = this.listener._engine.cvt.getState();
        deepEqual(cvt[2], target);
    });
    
    test('engine purge', 2, function() {
        this.listener._shouldPurge = true;
        var size = this.listener._onPurgeEngine();
        equal(size, 0);
        ok(!this.listener._shouldPurge);
    });
});