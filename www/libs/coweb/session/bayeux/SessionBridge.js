//
// Handles the flow from session preparation to update completion over Bayeux.
//
// @todo: dojo replacement
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
define([
    'coweb/session/bayeux/CowebExtension',
    'coweb/session/bayeux/ListenerBridge'
], function(ext, lbridge) {
    var bridge = function(args) {
        // state constants
        DISCONNECTING = 0;
        IDLE = 1;
        PREPARING = 2;
        PREPARED = 3;
        JOINING = 4;
        JOINED = 5;
        UPDATING = 6;
        UPDATED = 7;

        // init variables
        this._listener = args.listener;
        this._debug = args.debug;
        this._adminUrl = args.adminUrl;
        this._state = this.IDLE;
        this._connectToken = null;
        
        // deferred for session sequence
        this._prepDef = null;
        this._joinDef = null;
        this._updateDef = null;

        // info received from server
        this._prepResponse = null;

        // determine when to schedule destruction based on browser unload
        // event support, prefer onbeforeunload
        this.supportsBeforeUnload = (
            document.body.onbeforeunload !== undefined &&
            navigator.userAgent.search(/iPad|iPhone|iPod/) < 0
        );

        // build listener bridge instance
        this._lbridgeInst = new lbridge({
            debug: this._debug,
            listener: this._listener,
            sessionc: this
        });
    };

    bridge.prototype.destroy = function() {
        this._prepDef = null;
        this._joinDef = null;
        this._updateDef = null;
        this._listener = null;
        if(this._state != this.IDLE) {
            // force a logout
            this.logout();
        }
    };

    bridge.prototype.getState = function() {
        return this._state;
    };

    bridge.prototype.getListenerBridge = function() { 
        return this._lbridgeInst;
    };

    bridge.prototype.prepareConference = function(key, collab) {
        // make sure we're idle
        if(this._state != this.IDLE) {
            throw new Error(this.id + ': cannot prepare in non-idle state');
        }
        this._prepDef = new dojo.Deferred();
        var data = {            
            key : key,
            collab : collab
        };
        var self = this;
        var args = {
            url : this._adminUrl,
            handleAs: 'json',
            headers: { "Content-Type": "application/json" },
            preventCache: true,
            postData : dojo.toJson(data),
            load: function(resp, ioargs) { 
                self._onPrepareResponse(resp, ioargs);
            },
            error: function(err, ioargs) {
                self._onPrepareError(err, ioargs);
            }
        };
        dojo.xhrPost(args);
        // change state to avoid duplicate prepares
        this._state = this.PREPARING;
        return this._prepDef;
    };

    bridge.prototype._onPrepareResponse = function(resp, ioargs) {
        if(this._state == this.PREPARING) {
            this._state = this.PREPARED;
            var def = this._prepDef;
            this._prepDef = null;
            this._prepResponse = resp;
            // merge the username into the info so we can give back one object
            resp.info.username = resp.username;
            def.callback(resp);
        }
        // @todo: cleanup?
    };
    
    bridge.prototype._onPrepareError = function(err, ioargs) {
        // go back to idle state
        this._state = this.IDLE;
        var def = this._prepDef;
        this._prepDef = null;
        var s = ioargs.xhr.status;
        if(s == 403 || s == 401) {
            // need to auth
            def.errback(new Error('not-allowed'));
        } else {
            def.errback(new Error('server-unavailable'));
        }
    };

    bridge.prototype.joinConference = function() {
        if(this._state != this.PREPARED) {
            throw new Error(this.id + ': cannot join in unprepared state');
        }

        this._joinDef = new dojo.Deferred();
        // register extension to include session id in ext        
        org.cometd.unregisterExtension('coweb');
        var args = {sessionid : this._prepResponse.sessionid};
        org.cometd.registerExtension('coweb', new ext(args));

        org.cometd.configure({
            url : this._prepResponse.sessionurl, 
            logLevel: this._debug ? 'debug' : 'info',
            autoBatch : true,
            appendMessageTypeToURL: false
        });
        org.cometd.addListener('/meta/unsuccessful', this, '_onSessionUnsuccessful');
        this._connectToken = org.cometd.addListener('/meta/connect', this, '_onSessionConnect');
        org.cometd.addListener('/meta/disconnect', this, '_onSessionDisconnect');
        this._state = this.JOINING;
        org.cometd.handshake();
        return this._joinDef;
    };

    bridge.prototype._onSessionUnsuccessful = function(err) {
        //console.debug('_onSessionUnsuccessful', err);
        // pull out error code
        var bayeuxCode = '';
        if(err && err.error) {
            bayeuxCode = err.error.slice(0,3);
        }
        
        var tag;
        // @todo: handle 402, 412
        if(bayeuxCode == '500') {
            // unexpected server error
            this.onDisconnected(this._state, 'stream-error');
            // force a disconnect to avoid more communication
            this.logout();
        } else if(err.xhr && this._state > this.IDLE) {
            // low level error
            var httpCode = err.xhr.status;
            if(httpCode === 403 || httpCode == 401) {
                // missing auth error
                tag = 'not-allowed';
            } else if(httpCode === 0) {
                tag = 'server-unavailable';
            } else if(httpCode >= 500) {
                tag = 'server-unavailable';
            } else if(this._state > this.PREPARING) {
                tag = 'session-unavailable';
            }
            
            // invoke disconnected callback directly
            this.onDisconnected(this._state, tag);
            
            // force a local disconnect to avoid retries to a dead server
            this.logout();

            // notify join def if it happend during join
            var def = this._joinDef || this._updateDef;
            if(def) {
                this._updateDef = null;
                this._joinDef = null;
                def.errback(new Error(tag));
            }
        }
    };

    bridge.prototype._onSessionConnect = function(msg) {
        if(this._state == this.JOINING) {
            this._state = this.JOINED;
            var def = this._joinDef;
            this._joinDef = null;
            def.callback();
            
            // stop listening for connects after the first
            org.cometd.removeListener(this._connectToken);
            this._connectToken = null;
        }
        // @todo: other cleanup?
    };

    bridge.prototype._onSessionDisconnect = function(msg) {
        // client requested disconnect confirmed by the server
        if(this._state != this.IDLE) {
            this.onDisconnected(this._state, 'clean-disconnect');
        }
    };
    
    bridge.prototype.updateInConference = function() {
        if(this._state != this.JOINED) {
            throw new Error(this.id + ': cannot update in unjoined state');
        }
        
        this._state = this.UPDATING;
        this._updateDef = new dojo.Deferred();
        var self = this;
        this._lbridgeInst.initiateUpdate()
            .addCallback(function() { 
                self._onUpdateSuccess.apply(self, arguments)
            })
            .addErrback(function() { 
                self._onUpdateFailure.apply(self, arguments)
            });
        return this._updateDef;
    };
    
    bridge.prototype._onUpdateSuccess = function() {
        if(this._state == this.UPDATING) {
            this._state = this.UPDATED;
            var def = this._updateDef;
            this._updateDef = null;
            def.callback();
        }
    };
    
    bridge.prototype._onUpdateFailure = function(err) {
        if(this._state == this.UPDATING) {
            // do a logout to leave the session and go back to idle
            this.logout();
            var def = this._updateDef;
            this._updateDef = null;
            def.errback(err);
        }
    };

    bridge.prototype.logout = function(async) {
        // force sync logout if browser doesn't support onbeforeunload events
        async = (this.supportsBeforeUnload) ? !!async : false;
        if(this._state < this.IDLE) { 
            // ignore if already disconnecting
            return;
        } else if(this._state == this.IDLE) {
            // do the disconnect without any tracking
            org.cometd.disconnect(!async);
            return;
        }
        this._state = this.DISCONNECTING;
        org.cometd.disconnect(!async);
        if(this._state != this.IDLE) {
            // logout bombed, server must be dead; invoke callback manually
            this.onDisconnected(this._state, 'clean-disconnect');
        }
    };

    bridge.prototype.onDisconnected = function(state, tag) {
        // extension point
        // console.debug('onDisconnected state:', state, 'tag:', tag);
        this._state = this.IDLE;
    };

    return bridge;
});