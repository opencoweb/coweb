//
// Wraps the use of the session API in a class with declarative options and
// callback methods to override. An alternative to using the promise-based
// API for those that prefer classes and callbacks.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*global define*/
define([
    'require',
    'coweb/main'
], function(require, coweb) {
    /**
     * @constructor
     * @param {any} id id Unique id to assign to the CollabInterface instance
     * in this loader.
     */
    var SimpleLoader = function(id) {
        // prepare the session after run?
        this.autoPrepare = true;
        // join after prepare?
        this.autoJoin = true;
        // update after join?
        this.autoUpdate = true;
        // hard coded conference key to use
        this.cowebKey = undefined;
        // is the conference collaborative or standalone (bots only)?
        this.cowebCollab = true;

        // initialize session API
        this.sess = coweb.initSession();
        // initialize collab API
        this.collab = coweb.initCollab({id : id});
        this.collab.subscribeConferenceReady(this, 'onCollabReady');
        // place to hang onto the session metadata that comes back from server
        this.prepareMetadata = null;
    };
    var proto = SimpleLoader.prototype;

    proto.run = function() {
        // invoke initial extension point
        this.onRun();
        // attempt to prepare immediately
        if(this.autoPrepare) {
            this.prepare();
        }
    };

    proto.onRun = function() {
        // extension point
    };

    proto.onSessionPrepared = function(params) {
        // extension point
    };

    proto.onSessionJoined = function() {
        // extension point
    };
    
    proto.onSessionUpdated = function() {
        // extension point 
    };
    
    proto.onSessionFailed = function(err) {
        // extension point
    };
    
    proto.onCollabReady = function(info) {
        // extension point
    };

    proto.prepare = function() {
        var params = {collab : !!this.cowebCollab};
        if(this.cowebKey) {
            params.key = String(this.cowebKey);
        }
        params.autoJoin = this.autoJoin;
        params.autoUpdate = this.autoUpdate;
        
        // invoke prepare chain
        this.sess.prepareConference(params)
        .then('_onSessionPrepared', null, this)
        .then('_onSessionJoined', null, this)
        .then('_onSessionUpdated', 'onSessionFailed', this);
    };

    proto._onSessionPrepared = function(info) {
        // store metadata for later app access
        this.prepareMetadata = info;
        // notify the extension point; let exceptions bubble
        this.onSessionPrepared(info);
        return info.nextDef;
    };
    
    proto._onSessionJoined = function(info) {
        this.onSessionJoined();
        return info.nextDef;
    };
    
    proto._onSessionUpdated = function(info) {
        this.onSessionUpdated();
    };
    
    return SimpleLoader;
});
