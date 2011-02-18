//
// Handles the flow from session preparation to update completion over Bayeux.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*global define*/
define([
    'coweb/session/bayeux/cometd',
    'coweb/session/bayeux/CowebExtension',
    'coweb/session/bayeux/ListenerBridge',
    'coweb/util/Promise',
    'coweb/util/xhr'
], function(cometd, CowebExtension, ListenerBridge, Promise, xhr) {
    var SessionBridge = function(args) {
        // state constants
        this.DISCONNECTING = 0;
        this.IDLE = 1;
        this.PREPARING = 2;
        this.PREPARED = 3;
        this.JOINING = 4;
        this.JOINED = 5;
        this.UPDATING = 6;
        this.UPDATED = 7;

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
        this.disconnectDef = null;

        // info received from server
        this._prepResponse = null;

        // determine when to schedule destruction based on browser unload
        // event support, prefer onbeforeunload
        this.supportsBeforeUnload = (
            document.body.onbeforeunload !== undefined &&
            navigator.userAgent.search(/iPad|iPhone|iPod/) < 0
        );

        // build listener bridge instance
        this._bridge = new ListenerBridge({
            debug: this._debug,
            listener: this._listener,
            sessionc: this
        });
    };
    // save typing and lookup
    var proto = SessionBridge.prototype;

    proto.destroy = function() {
        this._prepDef = null;
        this._joinDef = null;
        this._updateDef = null;
        this._listener = null;
        if(this._state !== this.IDLE) {
            // force a logout
            this.logout();
        }
    };

    proto.getState = function() {
        return this._state;
    };

    proto.prepareConference = function(key, collab) {
        // make sure we're idle
        if(this._state !== this.IDLE) {
            throw new Error(this.id + ': cannot prepare in non-idle state');
        }
        // build new disconnect deferred
        this.disconnectDef = new Promise();
        // build new prepare deferred
        this._prepDef = new Promise();
        var data = {
            key : key,
            collab : collab
        };
        var self = this;
        var args = {
            method : 'POST',
            url : this._adminUrl,
            headers: {
                'Content-Type' : 'application/json;charset=UTF-8' 
            },
            body : JSON.stringify(data),
            onSuccess: function(resp, ioargs) { 
                self._onPrepareResponse(resp, ioargs);
            },
            onError: function(err, ioargs) {
                self._onPrepareError(err, ioargs);
            }
        };
        xhr.send(args);
        // change state to avoid duplicate prepares
        this._state = this.PREPARING;
        return this._prepDef;
    };

    proto._onPrepareResponse = function(text) {
        var resp = JSON.parse(text);
        if(this._state === this.PREPARING) {
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
    
    proto._onPrepareError = function(err, ioargs) {
        // go back to idle state
        this._state = this.IDLE;
        var def = this._prepDef;
        this._prepDef = null;
        var s = ioargs.xhr.status;
        if(s === 403 || s === 401) {
            // need to auth
            def.errback(new Error('not-allowed'));
        } else {
            def.errback(new Error('server-unavailable'));
        }
    };

    proto.joinConference = function() {
        if(this._state !== this.PREPARED) {
            throw new Error(this.id + ': cannot join in unprepared state');
        }

        this._joinDef = new Promise();
        // register extension to include session id in ext        
        cometd.unregisterExtension('coweb');
        var args = {sessionid : this._prepResponse.sessionid};
        cometd.registerExtension('coweb', new CowebExtension(args));

        cometd.configure({
            url : this._prepResponse.sessionurl, 
            logLevel: this._debug ? 'debug' : 'info',
            autoBatch : true,
            appendMessageTypeToURL: false
        });
        cometd.addListener('/meta/unsuccessful', this, '_onSessionUnsuccessful');
        this._connectToken = cometd.addListener('/meta/connect', this, '_onSessionConnect');
        cometd.addListener('/meta/disconnect', this, '_onSessionDisconnect');
        this._state = this.JOINING;
        cometd.handshake();
        return this._joinDef;
    };

    proto._onSessionUnsuccessful = function(err) {
        //console.debug('_onSessionUnsuccessful', err);
        // pull out error code
        var bayeuxCode = '';
        if(err && err.error) {
            bayeuxCode = err.error.slice(0,3);
        }
        
        var tag;
        // @todo: handle 402, 412
        if(bayeuxCode === '500') {
            // unexpected server error
            this.onDisconnected(this._state, 'stream-error');
            // force a disconnect to avoid more communication
            this.logout();
        } else if(err.xhr && this._state > this.IDLE) {
            // low level error
            var httpCode = err.xhr.status;
            if(httpCode === 403 || httpCode === 401) {
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
            this._onDisconnected(this._state, tag);
            
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

    proto._onSessionConnect = function(msg) {
        if(this._state === this.JOINING) {
            this._state = this.JOINED;
            var def = this._joinDef;
            this._joinDef = null;
            def.callback();
            
            // stop listening for connects after the first
            cometd.removeListener(this._connectToken);
            this._connectToken = null;
        }
        // @todo: other cleanup?
    };

    proto._onSessionDisconnect = function(msg) {
        // client requested disconnect confirmed by the server
        if(this._state !== this.IDLE) {
            this._onDisconnected(this._state, 'clean-disconnect');
        }
    };
    
    proto.updateInConference = function() {
        if(this._state !== this.JOINED) {
            throw new Error(this.id + ': cannot update in unjoined state');
        }
        
        this._state = this.UPDATING;
        this._updateDef = new Promise();
        this._bridge.initiateUpdate()
            .then(this, '_onUpdateSuccess', this, '_onUpdateFailure');
        return this._updateDef;
    };
    
    proto._onUpdateSuccess = function() {
        if(this._state === this.UPDATING) {
            this._state = this.UPDATED;
            var def = this._updateDef;
            this._updateDef = null;
            def.callback();
        }
    };
    
    proto._onUpdateFailure = function(err) {
        if(this._state === this.UPDATING) {
            // do a logout to leave the session and go back to idle
            this.logout();
            var def = this._updateDef;
            this._updateDef = null;
            def.errback(err);
        }
    };

    proto.logout = function(async) {
        // force sync logout if browser doesn't support onbeforeunload events
        async = (this.supportsBeforeUnload) ? !!async : false;
        if(this._state < this.IDLE) { 
            // ignore if already disconnecting
            return;
        } else if(this._state === this.IDLE) {
            // do the disconnect without any tracking
            cometd.disconnect(!async);
            return;
        }
        this._state = this.DISCONNECTING;
        cometd.disconnect(!async);
        if(this._state !== this.IDLE) {
            // logout bombed, server must be dead; invoke callback manually
            this._onDisconnected(this._state, 'clean-disconnect');
        }
    };

    proto._onDisconnected = function(state, tag) {
        // console.debug('onDisconnected state:', state, 'tag:', tag);
        this._state = this.IDLE;
        // notify disconnect deferred
        this.disconnectDef.callback({
            state : state,
            tag : tag
        });
    };

    return SessionBridge;
});