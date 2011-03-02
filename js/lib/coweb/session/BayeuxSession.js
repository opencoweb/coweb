//
// Bayeux implementation of the SessionInterface.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*global define window*/
define([
    'coweb/session/bayeux/SessionBridge',
    'coweb/util/Promise',
    'coweb/topics',
    'coweb/util/xhr',
    'coweb/util/lang',
    'org/OpenAjax'
], function(SessionBridge, Promise, topics, xhr, lang, OpenAjax) {
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
    };
    var proto = BayeuxSession.prototype;

    /**
     * Stores parameters.
     *
     * @param params Parameters given to the session factory function
     */
    proto.init = function(params, listenerImpl) {
        // store debug and strict compat check flags for later
        this._loginUrl = params.loginUrl;
        this._logoutUrl = params.logoutUrl;
        this._debug = params.debug;
        this._listener = listenerImpl;
        // create the bridge impl
        this._bridge = new SessionBridge({
            debug : this._debug,
            listener: this._listener,
            adminUrl : params.adminUrl
        });

        // cleanup on page unload, try to do it as early as possible so 
        // we can cleanly disconnect if possible
        var self = this;
        var destroy = function() { self.destroy(); };
        var tok;
        if(window.addEventListener) {
            window.addEventListener('onbeforeunload', destroy, false);
            window.addEventListener('onunload', destroy, false);
        } else if(window.attachEvent) {
            window.attachEvent('onbeforeunload', destroy);
            window.attachEvent('onunload', destroy);
        }
        this._unloadToks = destroy;
    };

    /**
     * Called on page unload to attempt a clean disconnect.
     */
    proto.destroy = function() {
        // set destroying state to avoid incorrect notifications
        this._destroying = true;
        // do a logout to disconnect from the session
        this.leaveConference();
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
            window.removeEventListener('onbeforeunload', this._unloadToks, false);
            window.removeEventListener('onunload', this._unloadToks, false);
        } else {
            window.detachEvent('onbeforeunload', this._unloadToks);
            window.detachEvent('onunload', this._unloadToks);
        }
        this._unloadToks = null;
    };

    /**
     * Gets if the session was initialized for debugging or not.
     *
     * @return True if debugging, false if not
     */
    proto.isDebug = function() {
        return this._debug;
    };
    
    /**
     * Gets a reference to the parameters last given to prepareConference().
     * Includes any values automatically filled in for missing attributes.
     */
    proto.getConferenceParams = function() {
        return this._lastPrep;
    };

    /**
     * Called by an application to leave a session or abort joining it.
     */    
    proto.leaveConference = function() {
        var state = this._bridge.getState();
        if(state !== this._bridge.UPDATED) {
            // notify busy state change
            OpenAjax.hub.publish(topics.BUSY, 'aborting');
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
     * Called by an app to optionally authenticate with the server.
     */
    proto.login = function(username, password) {
        if(this._bridge.getState() !== this._bridge.IDLE) {
            throw new Error('login() not valid in current state');
        }
        var p = new Promise();
        var args = {
            method : 'POST',
            url : this._loginUrl,
            body: JSON.stringify({username : username, password: password}),
            headers : {
                'Content-Type' : 'application/json;charset=UTF-8'
            }
        };
        return xhr.send(args);
    };

    /**
     * Called by an app to optionally logout from the server.
     */
    proto.logout = function() {
        // leave the session
        this.leaveConference();
        // contact credential server to remove creds
        var p = new Promise();
        var args = {
            method : 'GET',
            url : this._logoutUrl
        };
        return xhr.send(args);
    };

    /**
     * Called by an app to prepare a session.
     */
    proto.prepareConference = function(params) {
        if(this._bridge.getState() !== this._bridge.IDLE) {
            throw new Error('prepareConference() not valid in current state');
        }

        // get url params
        var urlParams = {};
        var searchText = window.location.search.substring(1);
        var searchSegs = searchText.split('&');
        for(var i=0, l=searchSegs.length; i<l; i++) {
            var tmp = searchSegs[i].split('=');
            urlParams[decodeURIComponent(tmp[0])] = decodeURIComponent(tmp[1]);
        }

        if(params.key === undefined) {
            // app didn't specify explicit key
            if(urlParams.cowebkey !== undefined) {
                // use the key from the url
                params.key = urlParams.cowebkey;
            } else {
                // default to use the full url minus the hash value
                params.key = decodeURI(window.location.host + window.location.pathname + window.location.search);
            }            
        }
        
        if(params.autoJoin === undefined) {
            // auto join by default
            params.autoJoin = true;
        }
        
        if(params.autoUpdate === undefined) {
            // auto update by default
            params.autoUpdate = true;
        }

        // create a promise and hang onto its ref as part of the params
        this._prepParams = lang.clone(params);
        this._prepParams.promise = new Promise();

        // store second copy of prep info for public access to avoid meddling
        this._lastPrep = lang.clone(params);

        // only do actual prep if the session has reported it is ready
        // try to prepare conference
        this._bridge.prepareConference(params.key, params.collab)
            .then('_onPrepared', '_onPrepareError', this);
        // start listening to disconnections
        this._bridge.disconnectPromise.then('_onDisconnected', null, this);

        // show the busy dialog for the prepare phase
        OpenAjax.hub.publish(topics.BUSY, 'preparing');

        // return promise
        return this._prepParams.promise;
    };
    
    proto._onPrepared = function(params) {
        // store response
        this._prepParams.response = JSON.parse(JSON.stringify(params));
        // pull out the promise
        var promise = this._prepParams.promise;
        // if auto joining, build next promise and pass with params
        if(this._prepParams.autoJoin) {
            params.nextPromise = new Promise();
        }
        // inform all promise listeners about success
        var appError = promise.resolve(params);
        if(this._prepParams.autoJoin && !appError) {
            // continue auto join, but only if app did not throw an unexpected
            // error in one of its promise listeners
            this.joinConference(params.nextPromise);
        }
    };

    proto._onPrepareError = function(err) {
        // notify busy dialog of error; no disconnect at this stage because 
        // we're not using cometd yet
        OpenAjax.hub.publish(topics.BUSY, err.message);

        // invoke prepare error callback
        var promise = this._prepParams.promise;
        this._prepParams = null;
        promise.fail(err);
    };

    /**
     * Called by an app to join a session.
     */
    proto.joinConference = function(nextPromise) {
        if(this._bridge.getState() !== this._bridge.PREPARED) {
            throw new Error('joinConference() not valid in current state');
        }

        // switch busy dialog to joining state
        OpenAjax.hub.publish(topics.BUSY, 'joining');

        // new promise for join success / failure
        this._prepParams.promise = nextPromise || new Promise();
        this._bridge.joinConference().then('_onJoined', '_onJoinError', this);
        return this._prepParams.promise;
    };

    proto._onJoined = function() {
        // pull out the promise
        var promise = this._prepParams.promise;
        var params = {};
        // if auto updating, build next promise and pass with params
        if(this._prepParams.autoUpdate) {
            params.nextPromise = new Promise();
        }
        // inform all promise listeners about success
        var appError = promise.resolve(params);
        if(this._prepParams.autoUpdate && !appError) {
            // continue auto join, but only if app did not throw an unexpected
            // error in one of its promise listeners
            this.updateInConference(params.nextPromise);
        }
    };

    proto._onJoinError = function(err) {
        // nothing to do, session goes back to idle
        var promise = this._prepParams.promise;
        this._prepParams = null;
        promise.fail(err);
    };
    
    /**
     * Called by an application to update its state in a session.
     */
    proto.updateInConference = function(nextPromise) {
        if(this._bridge.getState() !== this._bridge.JOINED) {
            throw new Error('updateInConference() not valid in current state');
        }
        // show the busy dialog for the update phase
        OpenAjax.hub.publish(topics.BUSY, 'updating');

        // new promise for join success / failure
        this._prepParams.promise = nextPromise || new Promise();
        this._bridge.updateInConference().then('_onUpdated', '_onUpdateError',
            this);
        return this._prepParams.promise;
    };

    proto._onUpdated = function() {
        var prepParams = this._prepParams;
        this._prepParams = null;
        // notify session interface of update success
        var promise = prepParams.promise;
        // notify of update success
        promise.resolve();

        // session is now updated in conference
        OpenAjax.hub.publish(topics.BUSY, 'ready');
    };

    proto._onUpdateError = function(err) {
        // nothing to do yet, session goes back to idle
        var promise = this._prepParams.promise;
        this._prepParams = null;
        promise.fail(err);
    };

    proto._onDisconnected = function(result) {
        // pull state and tag info about of promise result
        var state = result.state, tag = result.tag;
        if(tag && !this._destroying) {
            // show an error in the busy dialog
            OpenAjax.hub.publish(topics.BUSY, tag);
        }
        // stop the hub listener from performing further actions
        this._listener.stop(true);

        // keep prep info if a promise is still waiting for notification
        if(this._prepParams && !this._prepParams.promise) {
            this._prepParams = null;
        }
    };

    return BayeuxSession;
});
