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
    /**
     * @constructor
     * @param {String} [args.id=args.widget.id] Unique identifier of this 
     * wrapper / widget
     * @param {Object} args.widget Widget to wrap
     */
    var CowebWrapper = function(args) {
        // widget to wrap
        this.widget = args.widget;
        // id of this instance
        this.id = args.id || this.widget.id;
        // init collab interface
        this.collab = coweb.initCollab({id : this.id});
        // listen to ready and full state events
        this.collab.subscribeReady(this, 'onReady');
        this.collab.subscribeStateRequest(this, 'onStateRequest');
        this.collab.subscribeStateResponse(this, 'onStateRequest');
    };
    var proto = CowebWrapper.prototype;

    /**
     * Unsubscribes all callbacks from the CollabInterface instance. Should be
     * invoked on widget destruction.
     */
    proto.uninitialize = function() {
        // invoke this to unsubscribe on widget destruction
        this.collab.unsubscribeAll();
    };
    
    /**
     * Invoked when the CollabInterface reports the application is ready for
     * cooperation in the session.
     *
     * @param {Object} info Session information
     */
    proto.onReady = function(info) {
        // override to handle session ready
    };
    
    /**
     * Invoked when the CollabInterface receives a request for this widget's
     * full state. The implementation should invoke 
     * this.collab.sendStateResponse.
     *
     * @param {String} token Token to include in the state response call
     */
    proto.onStateRequest = function(token) {
        // override and invoke this.collab.sendStateResponse
    };
    
    /**
     * Invoked when the CollabInterface receives a copy of the shared state
     * state of this widget. The implementation should set the widget to this
     * state.
     *
     * @param {any} state Widget state
     */    
    proto.onStateResponse = function(state) {
        // override to apply state
    };
    
    return CowebWrapper;
});