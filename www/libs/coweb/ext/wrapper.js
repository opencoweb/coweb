//
// A wrapper to assist in making application widgets cooperative. Subclass it
// or treat it as a template.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
dojo.provide('coweb.ext.wrapper');
dojo.require('coweb');

dojo.declare('coweb.ext.wrapper.CoopWrapper', null, {
    // widget to wrap
    widget: null,
    // id of this instance
    id : null,
    constructor: function(args) {
        dojo.mixin(this, args);
        // adopt widget id if it has one
        this.id = this.id || this.widget.id;
        // init collab interface
        this.collab = coweb.initCollab({id : this.id});
        // listen to ready and full state events
        this.collab.subscribeConferenceReady(this, 'onReady');
        this.collab.subscribeStateRequest(this, 'onStateRequest');
        this.collab.subscribeStateResponse(this, 'onStateRequest');
    },
    
    uninitialize: function() {
        this.collab.unsubscribeAll();
    },
    
    onReady: function(info) {
        // override
    },
    
    onStateRequest: function(token) {
        // override and invoke this.collab.sendStateResponse
    },
    
    onStateResponse: function(state) {
        // override
    }
});