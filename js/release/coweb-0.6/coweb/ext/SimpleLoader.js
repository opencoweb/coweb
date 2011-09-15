//
// Wraps the use of the session API in a class with declarative options and
// callback methods to override. An alternative to using the promise-based
// API for those that prefer classes and callbacks.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*jslint white:false, bitwise:true, eqeqeq:true, immed:true, nomen:false, 
  onevar:false, plusplus:false, undef:true, browser:true, devel:true, 
  forin:false, sub:false*/
/*global define*/
define([
    'require',
    'coweb/main'
], function(require, coweb) {
    /**
     * @constructor
     * @param {String} id Unique id to assign to the CollabInterface instance
     * in this loader
     */
    var SimpleLoader = function(id) {
        // hard coded conference key to use
        this.cowebKey = undefined;
        // is the conference collaborative or standalone (bots only)?
        this.cowebCollab = true;

        // initialize session API
        this.sess = coweb.initSession();
        // initialize collab API
        this.collab = coweb.initCollab({id : id});
        this.collab.subscribeReady(this, 'onCollabReady');
        // place to hang onto the session metadata that comes back from server
        this.prepareMetadata = null;
    };
    var proto = SimpleLoader.prototype;

    /**
     * Starts the loader sequence.
     */
    proto.run = function() {
        // invoke initial extension point
        this.onRun();
        // attempt to prepare immediately
        this.prepare();
    };

    /**
     * Override to perform work when the loader starts running.
     */
    proto.onRun = function() {
        // extension point
    };

    /**
     * Override to handle successful session preparation.
     *
     * @param {Object} info Session information from SessionInterface.prepare
     */
    proto.onSessionPrepared = function(info) {
        // extension point
    };

    /**
     * Override to handle successful session joining.
     *
     * @param {Object} info Session information from SessionInterface.join
     */
    proto.onSessionJoined = function(info) {
        // extension point
    };

    /**
     * Override to handle successful application updating within the session.
     *
     * @param {Object} info Session information from SessionInterface.update
     */
    proto.onSessionUpdated = function(info) {
        // extension point 
    };

    /**
     * Override to handle any failure while preparing, joining, or updating
     * in the session.
     *
     * @param {Error} err Error object
     */
    proto.onSessionFailed = function(err) {
        // extension point
    };
    
    /**
     * Override to handle the CollaborationInterface.subscribeReady callback.
     *
     * @param {Object} info Roster info from the callback
     */
    proto.onCollabReady = function(info) {
        // extension point
    };

    /**
     * Initiates the prepare, join, and update sequence with empty callbacks
     * subscribed to receive notification in each phase.
     */
    proto.prepare = function() {
        var params = {collab : !!this.cowebCollab};
        if(this.cowebKey) {
            params.key = String(this.cowebKey);
        }
        // loader will do the join and update to ensure all callbacks
        // are invoked
        params.autoJoin = false;
        params.autoUpdate = false;
        
        // invoke prepare chain
        this.sess.prepare(params)
        .then('_onSessionPrepared', null, this)
        .then('_onSessionJoined', null, this)
        .then('_onSessionUpdated', 'onSessionFailed', this);
    };

    /**
     * Invokes onSessionPrepared and then SessionInterface.join. 
     *
     * @private
     */
    proto._onSessionPrepared = function(info) {
        // store metadata for later app access
        this.prepareMetadata = info;
        // notify the extension point; let exceptions bubble
        this.onSessionPrepared(info);
        // do the join
        return this.sess.join();
    };

    /**
     * Invokes onSessionJoined and then SessionInterface.update. 
     *
     * @private
     */
    proto._onSessionJoined = function(info) {
        // notify the extension point; let exceptions bubble
        this.onSessionJoined(info);
        // do the update
        return this.sess.update();
    };
    
    /**
     * Invokes onSessionUpdated.
     * 
     * @private
     */
    proto._onSessionUpdated = function(info) {
        this.onSessionUpdated(info);
    };
    
    return SimpleLoader;
});
