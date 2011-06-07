//
// Tests for op engine pausing and resuming.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
//
/*global define equals equal deepEqual module test ok*/
define([
    'util',
    'mock/bridge',
    'mock/targets',
    'coweb/listener/UnmanagedHubListener',
    'coweb/topics',
    'org/OpenAjax'
], function(util, bridge, targets, UnmanagedHubListener, topics, OpenAjax) {

    module('op engine pause/resume', {
        setup: function() {
            // set up listener
            this.listener = new UnmanagedHubListener();
            this.listener.setSiteID(5);
            this.listener.start(bridge, {
                collab : true,
                username : targets.localUsername
            });
            this._subs = [];
        },
        teardown: function() {
            // clean up all clients
            util.all_clients = [];
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
    });

    test('simple pause resume', function() {
        OpenAjax.hub.publish(topics.PAUSE_TOPIC, true);
        this.listener.syncInbound(targets.syncTopic,
                                  targets.inSyncMsg.value,
                                  targets.inSyncMsg.type,
                                  targets.inSyncMsg.position,
                                  1,
                                  targets.inSyncMsg.context,
                                  1);
        deepEqual(this.listener._engine.cv.sites, [0,0,0,0,0,0]);
        OpenAjax.hub.publish(topics.RESUME_TOPIC, true);
        deepEqual(this.listener._engine.cv.sites, [0,1,0,0,0,0]);
    });

});