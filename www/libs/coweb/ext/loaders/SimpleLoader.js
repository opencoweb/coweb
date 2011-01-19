//
// Wraps the use of the session API in a class with declarative options and
// callback methods to override.
//
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
dojo.provide('coweb.ext.loaders.SimpleLoader');
dojo.require('coweb');

dojo.declare('coweb.ext.loaders.SimpleLoader', null, {
    // use built-in busy dialog?
    showBusy : true,
    // prepare the session after run?
    autoPrepare: true,
    // join after prepare?
    autoJoin: true,
    // update after join?
    autoUpdate: true,
    // root admin url for session object (defaults to /admin if undefined)
    adminUrl: undefined,
    // root login url for session object (defaults to /login if undefined)
    loginUrl: undefined,
    // root logout url for session object (defaults to /logout if undefined)
    logoutUrl: undefined,
    // hard coded conference key to use
    conferenceKey: null,
    // is the conference collaborative or standalone (bots only)?
    conferenceCollab: true,

    constructor: function() {
        // initialize session API
        this.sess = coweb.initSession({
            adminUrl : this.adminUrl,
            loginUrl : this.loginUrl,
            logoutUrl : this.logoutUrl
        });
        // initialize collab API
        this.collab = coweb.initCollab({id : this.declaredClass});
        this.collab.subscribeConferenceReady(dojo.hitch(this, 'onCollabReady'));
        // place to hang onto the session metadata that comes back from server
        this.prepareMetadata = null;
    },
    
    run: function() {
        // invoke initial extension point
        this.onRun();
        // attempt to prepare immediately
        if(this.autoPrepare) {
            this.prepare();
        }
    },

    onRun: function() {
        // extension point
    },

    onSessionPrepared: function(params) {
        // extension point
    },

    onSessionJoined: function() {
        // extension point
    },
    
    onSessionUpdated: function() {
        // extension point 
    },
    
    onSessionFailed: function(err) {
        // extension point
    },
    
    onCollabReady: function(info) {
        // extension point
    },

    prepare: function() {
        if(this.showBusy) {
            // use the built-in busy dialog
            dojo.require('coweb.ext.ui.BusyDialog');
            coweb.ext.ui.createBusy(this.sess);
        }

        var params = {collab : !!this.conferenceCollab};
        if(this.conferenceKey !== null) {
            params.key = String(this.conferenceKey);
        }
        params.autoJoin = this.autoJoin;
        params.autoUpdate = this.autoUpdate;
        
        var self = this;
        this.sess.prepareConference(params)
        .then(function(info) {
            self._onSessionPrepared(info);
            return info.nextDef;
        })
        .then(function(info) {
            self._onSessionJoined();
            return info.nextDef;
        })
        .then(function() {
            self._onSessionUpdated();
        }, dojo.hitch(this, 'onSessionFailed'));
    },

    _onSessionPrepared: function(params) {
        // store metadata for later app access
        this.prepareMetadata = params;
        // notify the extension point; let exceptions bubble
        this.onSessionPrepared(params);
    },
    
    _onSessionJoined: function() {
        this.onSessionJoined();
    },
    
    _onSessionUpdated: function() {
        this.onSessionUpdated();
    }
});
