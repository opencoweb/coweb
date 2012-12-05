//
// Bayeux implementation of the SessionInterface.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*jslint white:false, bitwise:true, eqeqeq:true, immed:true, nomen:false, 
  onevar:false, plusplus:false, undef:true, browser:true, devel:true, 
  forin:false, sub:false*/
/*global define window*/
define([
    'coweb/session/bayeux/SessionBridge',
    'coweb/util/Promise',
    'coweb/util/xhr',
    'coweb/util/lang',
	'org/requirejs/i18n!../nls/messages'
], function(SessionBridge, Promise, xhr, lang, messages) {
    /**
     * @constructor
     */
    var BayeuxSession = function() {
        // vars set during runtime
        this._prepParams = null;
        this._lastPrep = null;
        // params to be set by init
        this._debug = false;
        this._bridge = null;
        this._listener = null;
        this._destroying = false;
        this._unloadToks = {};
        this._loginUrl = null;
        this._logoutUrl = null;
        this._cacheState = false;

		this._navigateListeners = [];
    };
    var proto = BayeuxSession.prototype;

	proto.addNavigateListener = function(listener) {
		this._bridge.addNavigateListener(listener);
	};
	
	proto.removeNavigateListener = function(listener) {
		this._bridge.removeNavigateListener(listener);
	};

    /**
     * Stores coweb configuration info and the ListenerInterface impl to use.
     *
     * @param {Object} params cowebConfig object
     * @param {Object} listenerImpl ListenerInterface implementation
     */
    proto.init = function(params, listenerImpl) {
        // store debug and strict compat check flags for later
        this._loginUrl = params.loginUrl;
        this._logoutUrl = params.logoutUrl;
        this._debug = params.debug;
        this._cacheState = params.cacheState;
        this._listener = listenerImpl;
        // create the bridge impl
        this._bridge = new SessionBridge({
            debug : this._debug,
            listener: this._listener,
            adminUrl : params.adminUrl,
            baseUrl : params.baseUrl
        });

        // cleanup on page unload, try to do it as early as possible so 
        // we can cleanly disconnect if possible
        var self = this;
        var destroy = function() { self.destroy(); };
        this._unloader = destroy;
        if(window.addEventListener) {
            window.addEventListener('beforeunload', destroy, true);
            window.addEventListener('unload', destroy, true);
        } else if(window.attachEvent) {
            window.attachEvent('onbeforeunload', destroy);
            window.attachEvent('onunload', destroy);
        }
    };

    /**
     * Destroys this instance with proper cleanup. Allows creation of another
     * session singleton on the page.
     */
    proto.destroy = function() {
        // don't double destroy
        if(this._destroying) {return;}
        // set destroying state to avoid incorrect notifications
        this._destroying = true;
        // don't notify any more status changes
        this.onStatusChange = function() {};
        // let listener shutdown gracefully
        this._listener.stop();
        // cleanup the client
        this._bridge.destroy();
        // cleanup references
        this._listener = null;
        this._prepParams = null;
        this._lastPrep = null;
        this._bridge = null;
        // remove unload listeners
        if(window.removeEventListener) {
            window.removeEventListener('beforeunload', this._unloader, true);
            window.removeEventListener('unload', this._unloader, true);
        } else {
            window.detachEvent('onbeforeunload', this._unloader);
            window.detachEvent('onunload', this._unloader);
        }
        this._unloader = null;
    };

    /**
     * Gets if the session was initialized for debugging or not.
     *
     * @returns {Boolean} True if debugging, false if not
     */
    proto.isDebug = function() {
        return this._debug;
    };

    /**
     * Gets a reference to the parameters last given to prepare().
     * Includes any values automatically filled in for missing attributes.
     *
     * @returns {Object} Last prepare configuration
     */
    proto.getLastPrepare = function() {
        return this._lastPrep;
    };

    /**
     * Called by listener when joining a session is disallowed by the server.
     * This is likely due to the moderator deciding the client is not allowed to
     * join.
     */
    proto._joinDisallowed = function(err) {
        this.onStatusChange('join-disallowed');
        this._prepParams = null;
        this._listener.stop();
        this._bridge.disconnect();
    };

    /**
     * Called by an application to leave a session or abort attempting to enter
     * it.
     *
     * @returns {Promise} Promise resolved immediately in this impl
     */    
    proto.leave = function() {
        var state = this._bridge.getState();
        if(state !== this._bridge.UPDATED) {
            // notify busy state change
            this.onStatusChange('aborting');
        }
        // cleanup prep params
        this._prepParams = null;
        // let listener shutdown
        this._listener.stop();
        // promise unused in this impl, instantly resolved
        var promise = new Promise();
        promise.resolve();
        // do the session logout
        this._bridge.disconnect();
        return promise;
    };

    /**
     * Called by an app to optionally authenticate with the server. POSTs
     * JSON encoded username and password to the cowebConfig.loginUrl.
     *
     * @param {String} username
     * @param {String} password
     * @returns {Promise} Promise resolved upon POST success or failure
     */
    proto.login = function(username, password) {
        if(this._bridge.getState() !== this._bridge.IDLE) {
            throw new Error(messages.logininvalid);
        }
        var p = new Promise();
        var args = {
            method : 'POST',
            url : this._loginUrl,
            body: JSON.stringify({username : username, password: password}),
            headers : {
                'Content-Type' : 'application/json;charset=UTF-8',
                'Cache-Control' : 'no-cache'
            }
        };
        return xhr.send(args);
    };

    /**
     * Called by an app to optionally logout from the server. GETs the 
     * cowebConfig.logoutUrl.
     *
     * @returns {Promise} Promise resolved upon GET success or failure
     */
    proto.logout = function() {
        // leave the session
        this.leave();
        // contact credential server to remove creds
        var p = new Promise();
        var args = {
            method : 'GET',
            url : this._logoutUrl
        };
        return xhr.send(args);
    };

    /**
     * Called by an app to prepare a coweb session.
     *
     * @param {Object} Session preparation options
     * @returns {Promise} Promise resolved when the last phase (prepare, join,
     * update) set to automatically run completes or fails
     */
    proto.prepare = function(params) {
        if(this._bridge.getState() !== this._bridge.IDLE) {
            throw new Error(messages.prepareinvalid);
        }
        params = params || {};

		var requestUrl = decodeURI(window.location.host + window.location.pathname + window.location.search);
        // get url params
        var urlParams = {};
        //var defaultKey = false;
		var sessionName = "";
        var searchText = window.location.search.substring(1);
        var searchSegs = searchText.split('&');
        for(var i=0, l=searchSegs.length; i<l; i++) {
            var tmp = searchSegs[i].split('=');
            urlParams[decodeURIComponent(tmp[0])] = decodeURIComponent(tmp[1]);
        }
        
        if(params.collab === undefined) {
            // default to using a collaborative session
            params.collab = true;
        }

        if(params.key === undefined) {
            // app didn't specify explicit key
            if(urlParams.cowebkey !== undefined) {
                // use the key from the url
                params.key = urlParams.cowebkey;
            } else {
				
				var key = this._cowebkeyFromHash();
				if(!key) {
                	// default to use the full url minus the hash value
                	params.key = null;
					// this tells the server the key was generated
					// and not specified in the requesting url.
					//defaultKey = true;
				}
				else {
					params.key = key;
				}
            }
        }


		if(urlParams.sessionName != undefined) {
			sessionName = urlParams.sessionName;
		}
		
        if(params.autoJoin === undefined) {
            // auto join by default
            params.autoJoin = true;
        }
        
        if(params.autoUpdate === undefined) {
            // auto update by default
            params.autoUpdate = true;
        }

        if(params.updaterType === undefined) {
            params.updaterType = "default";
        }
        // create a promise and hang onto its ref as part of the params
        this._prepParams = lang.clone(params);
        this._prepParams.promise = new Promise();

        // store second copy of prep info for public access to avoid meddling
        this._lastPrep = lang.clone(params);

        // only do actual prep if the session has reported it is ready
        // try to prepare conference
        this._bridge.prepare(params.key, params.collab, this._cacheState, requestUrl, sessionName,params.userDefined)
            .then('_onPrepared', '_onPrepareError', this);
        // start listening to disconnections
        this._bridge.disconnectPromise.then('_onDisconnected', null, this);

        // show the busy dialog for the prepare phase
        this.onStatusChange('preparing');

        // return promise
        return this._prepParams.promise;
    };

	proto.navigate = function(url) {
		this._bridge.navigate(url);
	};

	proto._cowebkeyFromHash = function() {
		var hash = window.location.hash;
		if(!hash || hash.indexOf('cowebkey') == -1) {
			return null;
		}
		
		var parts = hash.split('/');
		if(!parts || parts.length == 0) {
			return null;
		}
		
		for(var i=0; i<parts.length; i++) {
			if(parts[i] == 'cowebkey') {
				if(i+1 >= parts.length) {
					return null;
				}
				else {
					return parts[i+1];
				}
			}
		}
		
		return null;		
	};
    
    /**
     * @private
     */
    proto._onPrepared = function(params) {
        // store response
        this._prepParams.response = JSON.parse(JSON.stringify(params));

		//check for a generated coweb key and apply hash to window location.
		//we know the key was generated by checking the original request params.
		//if the original key was null and we get a new key on return we know it
		//was generated by the server.
		var key = this._prepParams.response['key'];
		if((this._prepParams.key === undefined || this._prepParams.key == null) && key != null) {
			var hash = "/cowebkey/" + key;
			hash = (window.location.hash) ? window.location.hash + hash : "#" + hash;
			
			window.location.hash = hash;
		}
		/*
		var generatedCowebkey = this._prepParams.response['generatedcowebkey'];
		if(generatedCowebkey) {
			var hash = "/cowebkey/" + generatedCowebkey;
			hash = (window.location.hash) ? window.location.hash + hash : "#" + hash;
			
			window.location.hash = hash;	
		}
		*/
		        // attach phase to response
        this._prepParams.response.phase = 'prepare';

        if(this._prepParams.autoJoin) {
            // continue to join without resolving promise
            this.join({updaterType:this._prepParams.updaterType});
        } else {
            // pull out the promise
            var promise = this._prepParams.promise;
            this._prepParams.promise = null;
            // resolve the promise and let the app dictate what comes next
            promise.resolve(this._prepParams.response);
        }
    };

    /**
     * @private
     */
    proto._onPrepareError = function(err) {
        // notify busy dialog of error; no disconnect at this stage because 
        // we're not using cometd yet
        this.onStatusChange(err.message);

        // invoke prepare error callback
        var promise = this._prepParams.promise;
        this._prepParams = null;
        promise.fail(err);
    };

    /**
     * Called by an app to join the prepared session.
     * @param {Object} Session join options
     * @returns {Promise} Promise resolved when the last phase (prepare, join,
     * update) set to automatically run completes or fails
     */
    proto.join = function(params) {
        if(this._bridge.getState() !== this._bridge.PREPARED) {
            throw new Error(messages.joininvalid);
        }
        params = params || {};

        // indicate joining status
        this.onStatusChange('joining');
        // attach phase to response
        this._prepParams.response.phase = 'join';

        if(!this._prepParams.promise) {
            // new promise for join if prepare was resolved
            this._prepParams.promise = new Promise();
        }
        if (params.updaterType === undefined) {
        	params.updaterType = 'default';
        }
        this._bridge.join(params.updaterType).then('_onJoined', '_onJoinError', this);
        return this._prepParams.promise;
    };

    /**
     * @private
     */
    proto._onJoined = function() {
        if(this._prepParams.autoUpdate) {
            // continue to update without resolving promise
            this.update();
        } else {
            // pull out the promise
            var promise = this._prepParams.promise;
            this._prepParams.promise = null;
            // resolve the promise and let the app dictate what comes next
            promise.resolve(this._prepParams.response);
        }
    };

    /**
     * @private
     */
    proto._onJoinError = function(err) {
        // nothing to do, session goes back to idle
        var promise = this._prepParams.promise;
        this._prepParams = null;
        promise.fail(err);
    };
    
    /**
     * Called by an application to update its state in the joined session.
     *
     * @returns {Promise} Promise resolved when the last phase (prepare, join,
     * update) set to automatically run completes or fails
     */
    proto.update = function(nextPromise) {
        if(this._bridge.getState() !== this._bridge.JOINED) {
            throw new Error(messages.updateinvalid);
        }

        // indicate updating status
        this.onStatusChange('updating');
        // attach phase to response
        this._prepParams.response.phase = 'update';

        if(!this._prepParams.promise) {
            // new promise for update if prepare+join was resolved
            this._prepParams.promise = new Promise();
        }
        this._bridge.update().then('_onUpdated', '_onUpdateError', this);
        return this._prepParams.promise;
    };

    /**
     * @private
     */
    proto._onUpdated = function() {
        var prepParams = this._prepParams;
        this._prepParams = null;
        // notify session interface of update success
        var promise = prepParams.promise;
        var response = prepParams.response;
        // notify of update success
        promise.resolve(response);

        // session is now updated in conference
        this.onStatusChange('ready');
    };

    /**
     * @private
     */
    proto._onUpdateError = function(err) {
        // nothing to do yet, session goes back to idle
        var promise = this._prepParams.promise;
        this._prepParams = null;
        promise.fail(err);
    };

    /**
     * @private
     */
    proto._onDisconnected = function(result) {
        // pull state and tag info about of promise result
        var state = result.state, tag = result.tag;
        if(tag && !this._destroying) {
            // show an error in the busy dialog
            this.onStatusChange(tag);
        }
        // stop the hub listener from performing further actions
        this._listener.stop(true);

        // keep prep info if a promise is still waiting for notification
        if(this._prepParams && !this._prepParams.promise) {
            this._prepParams = null;
        }
    };

    /**
     * Called when the session status changes (e.g., preparing -> joining).
     * To be overridden by an application to monitor status changes.
     * 
     * @param {String} status Name of the current status
     */
    proto.onStatusChange = function(status) {
        // extension point
    };

    return BayeuxSession;
});
