//
// Bridges the SessionInterface to Bayeux/cometd and the ListenerInterface.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*jslint white:false, bitwise:true, eqeqeq:true, immed:true, nomen:false, 
  onevar:false, plusplus:false, undef:true, browser:true, devel:true, 
  forin:false, sub:false*/
/*global define*/
define([
    'coweb/session/bayeux/cometd',
    'coweb/session/bayeux/CowebExtension',
    'coweb/session/bayeux/ListenerBridge',
    'coweb/util/Promise',
    'coweb/util/xhr'
], function(cometd, CowebExtension, ListenerBridge, Promise, xhr) {
    /**
     * @constructor
     * @param {Boolean} args.debug True if in debug more, false if not
     * @param {Object} args.listener ListenerInterface instance
     * @param {String} args.adminUrl Target of prepare POST
     */
    var SessionBridge = function(args) {
		//console.log('new session bridge');
		//console.log(args);
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
        this._debug = args.debug;
        this._adminUrl = args.adminUrl;
        this._baseUrl = args.baseUrl;
        this._state = this.IDLE;
        this._connectToken = null;
        
        // promises for session sequence
        this._prepPromise = null;
        this._joinPromise = null;
        this._updatePromise = null;
        this.disconnectPromise = null;

        // info received from server
        this.prepResponse = null;

        // build listener bridge instance
        this._bridge = new ListenerBridge({
            debug: this._debug,
            listener: args.listener,
            bridge: this
        });
    };
    // save typing and lookup
    var proto = SessionBridge.prototype;

    /**
     * Destroys the instance. Voids all promises without resolution. Attempts
     * a disconnect from the server if not idle.
     */
    proto.destroy = function() {
        this._prepPromise = null;
        this._joinPromise = null;
        this._updatePromise = null;
        if(this._state !== this.IDLE) {
            // force a disconnect
            this.disconnect(true);
        }
    };

    /**
     * @returns {Number} Current state constant
     */
    proto.getState = function() {
        return this._state;
    };

    /**
     * POSTs the (key, collab) tuple to the cowebConfig.adminUrl to get the
     * associated session information.
     *
     * @params {String} key Key identifying the session to join
     * @params {Boolean} collab True to request a cooperative session, false
     * @params {Boolean} cacheState True to turn state caching on
     * to request a session with access to services only
	 * @params {Boolean} defaultKey Tells the server if the cowebkey was
	 * generated or specified in the url.
     * @returns {Promise} Resolved on response from server
     */
    proto.prepare = function(key, collab, cacheState, defaultKey) {
        // make sure we're idle
        if(this._state !== this.IDLE) {
            throw new Error(this.id + ': cannot prepare in non-idle state');
        }
        // build new disconnect promise
        this.disconnectPromise = new Promise();
        // build new prepare promise
        this._prepPromise = new Promise();
        var data = {
            key : key,
            collab : collab,
            cacheState : cacheState,
            defaultKey : defaultKey
        };
        var args = {
            method : 'POST',
            url : this._adminUrl,
            headers: {
                'Content-Type' : 'application/json;charset=UTF-8' 
            },
            body : JSON.stringify(data)
        };
        var promise = xhr.send(args);
        promise.then('_onPrepareResponse', '_onPrepareError', this);
        // change state to avoid duplicate prepares
        this._state = this.PREPARING;
        return this._prepPromise;
    };

    /**
     * @private
     */
    proto._onPrepareResponse = function(args) {
        var resp = JSON.parse(args.xhr.responseText);
        if(this._state === this.PREPARING) {
            this._state = this.PREPARED;
            var promise = this._prepPromise;
            this._prepPromise = null;
            this.prepResponse = resp;
            promise.resolve(resp);
        }
    };

    /**
     * @private
     */    
    proto._onPrepareError = function(args) {
        // go back to idle state
        this._state = this.IDLE;
        var promise = this._prepPromise;
        this._prepPromise = null;
        var s = args.xhr.status;
        if(s === 403 || s === 401) {
            // need to auth
            promise.fail(new Error('not-allowed'));
        } else {
            promise.fail(new Error('server-unavailable'));
        }
    };

    /**
     * Initiates the Bayeux handshake with the Bayeux handler for the session.
     *
     * @params {String} updateType indicating what type of updater should be used when joining
     * @returns {Promise} Resolved on handshake with server
     */
    proto.join = function(updaterType) {
        if(this._state !== this.PREPARED) {
            throw new Error(this.id + ': cannot join in unprepared state');
        }

        this._joinPromise = new Promise();
        // register extension to include session id in ext        
        cometd.unregisterExtension('coweb');
        var args = {sessionid : this.prepResponse.sessionid, updaterType: updaterType};
        cometd.registerExtension('coweb', new CowebExtension(args));

        cometd.configure({
            url : this._baseUrl + this.prepResponse.sessionurl, 
            logLevel: this._debug ? 'debug' : 'info',
            autoBatch : true,
            appendMessageTypeToURL: false
        });
        cometd.addListener('/meta/unsuccessful', this, '_onSessionUnsuccessful');
        this._connectToken = cometd.addListener('/meta/connect', this, '_onSessionConnect');
        cometd.addListener('/meta/disconnect', this, '_onSessionDisconnect');
        this._state = this.JOINING;
        cometd.handshake();
        return this._joinPromise;
    };

    /**
     * Called on /meta/unsuccessful notification from the cometd client for
     * any error. Forces a disconnect to prevent attempts to reconnect with
     * a dead server.
     *
     * @private
     * @param {Error} err Error object
     */
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
            this.disconnect();
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
            this.disconnect();

            // notify join promise if it happened during join
            var promise = this._joinPromise || this._updatePromise;
            if(promise) {
                this._updatePromise = null;
                this._joinPromise = null;
                promise.fail(new Error(tag));
            }
        }
    };

    /**
     * Called on successful first /meta/connect message from server indicating
     * a successful handshake.
     *
     * @private
     * @param {Object} msg Connect response
     */
    proto._onSessionConnect = function(msg) {
        if(this._state === this.JOINING) {
            this._state = this.JOINED;
            var promise = this._joinPromise;
            this._joinPromise = null;
            promise.resolve();
            
            // stop listening for connects after the first
            cometd.removeListener(this._connectToken);
            this._connectToken = null;
        }
    };

    /**
     * Called when the server confirms a /meta/disconnect message.
     *
     * @param {Object} msg Disconnect response
     */ 
    proto._onSessionDisconnect = function(msg) {
        // client requested disconnect confirmed by the server
        if(this._state !== this.IDLE) {
            this._onDisconnected(this._state, 'clean-disconnect');
        }
    };
    
    /**
     * Triggers the request for the current shared session state.
     *
     * @returns {Promise} Resolved on completion or failure of local 
     * application update
     */
    proto.update = function() {
        if(this._state !== this.JOINED) {
            throw new Error(this.id + ': cannot update in unjoined state');
        }
        
        this._state = this.UPDATING;
        this._updatePromise = new Promise();
        this._bridge.initiateUpdate()
            .then('_onUpdateSuccess', '_onUpdateFailure', this);
        return this._updatePromise;
    };
    
    /**
     * Called when the listener reports the local application successfully 
     * updated to the shared session state.
     *
     * @private
     */
    proto._onUpdateSuccess = function() {
        if(this._state === this.UPDATING) {
            this._state = this.UPDATED;
            var promise = this._updatePromise;
            this._updatePromise = null;
            promise.resolve();
        }
    };

    /**
     * Called when the listener reports a failure to update the loca 
     * application to the shared session state.
     *
     * @private
     */
    proto._onUpdateFailure = function(err) {
        if(this._state === this.UPDATING) {
            // do a disconnect to leave the session and go back to idle
            this.disconnect();
            var promise = this._updatePromise;
            this._updatePromise = null;
            promise.fail(err);
        }
    };
    
    /**
     * Sends a /meta/disconnect message to the server, synchronously or 
     * asynchronously. Triggers the _onDisconnected callback immediately if
     * already disconnected from the server.
     *
     * @param {Boolean} [sync=false] True to send the disconnect message 
     * synchronously, false to send it asynchronously
     */
    proto.disconnect = function(sync) {
        if(this._state < this.IDLE) { 
            // ignore if already disconnecting
            return;
        } else if(this._state === this.IDLE) {
            // do the disconnect without any tracking
            cometd.disconnect(sync);
            return;
        }
        this._state = this.DISCONNECTING;
        cometd.disconnect(sync);
        if(this._state !== this.IDLE) {
            // disconnect bombed, server must be dead; invoke callback manually
            this._onDisconnected(this._state, 'clean-disconnect');
        }
    };

    /**
     * Called when the local client is disconnected from the Bayeux server.
     *
     * @param {Number} state State of the session before the disconnect
     * @param {String} tag Tag explaining the reason for the disconnect
     */
    proto._onDisconnected = function(state, tag) {
        // console.debug('onDisconnected state:', state, 'tag:', tag);
        this._state = this.IDLE;
        // notify disconnect promise
        this.disconnectPromise.resolve({
            state : state,
            tag : tag
        });
    };

    return SessionBridge;
});