//
// Tests the UnamangedHubListener implementation of ListenerInterface.
// 
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
//
/*global define module test raises deepEqual ok equal strictEqual*/
define([
    'coweb/listener/UnmanagedHubListener',
    'org/OpenAjax',
    'coweb/topics'
], function(UnmanagedHubListener, OpenAjax, topics) {
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
                this.listener.destroy();
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
        inSyncMsg : {
            value : JSON.stringify('abc'),
            type : 'insert',
            position : 1,
            context : [0,0,0,0,0,0]
        },
        outSyncMsg : {
            value : 'abc',
            type : 'insert',
            position : 1
        },
        serviceName : 'somebot',
        serviceParams : {
            a : 'b',
            c : 'd'
        },
        serviceTopic : topics.SET_SERVICE+this.serviceName+'_0.wid4',
        stateMsg : {}
    };
    targets.stateMsg[topics.SET_STATE+'wid1'] = [1,2,3];
    targets.stateMsg[topics.SET_STATE+'wid2'] = [4,5];
    targets.stateMsg[topics.SET_STATE+'wid3'] = {6: 'seven'};    
    
    // mock bridge
    var bridge = {
        postSync: function(topic, msg) {
            equal(topic, targets.syncTopic);
            deepEqual(msg, targets.inSyncMsg);
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
            equal(serviceName, targets.serviceName);
            deepEqual(params, targets.serviceParams);
            equal(topic, targets.serviceTopic);
        },
        
        postStateResponse: function(topic, state, token) {
            // track all posted state
        }
    };
    
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
    
    module('listener bootstrap', modOpts());
    
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

    test('inbound sync', 2, function() {
        OpenAjax.hub.publish(targets.syncTopic, targets.outSyncMsg);
    });
    
    test('outbound sync', 1, function() {
    });
    
    test('inbound notice', 1, function() {
        
    });
    
    test('inbound state request', 1, function() {
        
    });
    
    test('outbound state response', 1, function() {
        
    });
    
    test('inbound state response', 1, function() {
        
    });
    
    test('outbound service subscribe', 1, function() {
        
    });

    test('outbound service unsubscribe', 1, function() {
        
    });

    test('outbound service request', 1, function() {
        
    });

    test('outbound engine sync', 1, function() {
        
    });

    test('inbound engine sync', 1, function() {
        
    });
});