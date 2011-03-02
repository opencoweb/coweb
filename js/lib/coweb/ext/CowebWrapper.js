//
// A wrapper to assist in making application widgets cooperative. Subclass it
// or treat it as a template.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
define([
    'coweb/main'
], function(coweb) {
    var CowebWrapper = function(id) {
        // widget to wrap
        this.widget = null;
        // id of this instance
        this.id = this.id || this.widget.id;
        // init collab interface
        this.collab = coweb.initCollab({id : this.id});
        // listen to ready and full state events
        this.collab.subscribeConferenceReady(this, 'onReady');
        this.collab.subscribeStateRequest(this, 'onStateRequest');
        this.collab.subscribeStateResponse(this, 'onStateRequest');
    };
    var proto = CowebWrapper.prototype;

    proto.uninitialize = function() {
        // invoke this to unsubscribe on widget destruction
        this.collab.unsubscribeAll();
    };
    
    proto.onReady = function(info) {
        // override to handle session ready
    };
    
    proto.onStateRequest = function(token) {
        // override and invoke this.collab.sendStateResponse
    };
    
    proto.onStateResponse = function(state) {
        // override to apply state
    };
    
    return CowebWrapper;
});