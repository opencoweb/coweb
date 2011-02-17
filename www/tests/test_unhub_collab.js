//
// Tests the UnamangedHubCollab implementation of CollabInterface.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
//
define([
    'coweb/collab/UnmanagedHubCollab',
    'org/OpenAjax',
    'coweb/topics'
], function(UnmanagedHubCollab, OpenAjax, topics) {
    module('collab', {
        setup: function() {
            this.collab = new UnmanagedHubCollab();
            this.collab.init({id : 'test'});
        },
        teardown: function() {
            this.collab.unsubscribeAll();
            delete this.collab;
        }
    });
    
    test('missing id', 2, function() {
        var collab2 = new UnmanagedHubCollab();
        raises(collab2.init);
        try {
            collab2.init({});
        } catch(e) {
            ok(e);
        }
    });
    
    test('missing init', 6, function() {
        var collab2 = new UnmanagedHubCollab();
        raises(collab2.sendSync);
        raises(collab2.subscribeSync);
        raises(collab2.subscribeStateRequest);
        raises(collab2.subscribeStateResponse);
        raises(collab2.sendStateResponse);
        raises(collab2.postService);
    });
    
    test('subscribe ready', 0, function() {
        var target, tok;
        target = {a : 'a', b : 'b'};
        tok = this.collab.subscribeConferenceReady(function(info) {
            deepEqual(info, target);
        });
        tok.then(function() {
            OpenAjax.hub.publish(topics.READY, target);
        });
    });
    
    test('subscribe end', 0, function() {
        
    });
    
    test('subscribe join', 0, function() {
        
    });
    
    test('subscribe leave', 0, function() {
        
    });
        
    test('subscribe sync', 0, function() {
        
    });
    
    test('send sync', 0, function() {
        
    });
    
    test('subscribe state request', 0, function() {
        
    });
    
    test('subscribe state response', 0, function() {
        
    });
    
    test('send state response', 0, function() {
        
    });
    
    test('subscribe service', 0, function() {
        
    });
    
    test('post to service', 0, function() {
        
    });
    
    test('unsubscribe service', 0, function() {
        
    });
    
    test('unsubscribe', 0, function() {
        
    });
    
    test('unsubscribe all', 0, function() {
        
    });
});