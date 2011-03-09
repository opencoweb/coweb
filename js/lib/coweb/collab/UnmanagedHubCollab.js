//
// Unmanaged OpenAjax Hub implementation of the CollabInterface.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*global define*/
define([
    'coweb/topics',
    'coweb/util/Promise',
    'org/OpenAjax'
], function(topics, Promise, OpenAjax) {
    var UnmanagedHubCollab = function() {
        this._mutex = false;
        this._serviceId = 0;
        this._tokens = {};
        this.id = undefined;
    };
    // save the finger joints
    var proto = UnmanagedHubCollab.prototype;

    /**
     * Stores the collaboration instance ID.
     *
     * @param params Parameter given to the collab wrapper factory function
     */    
    proto.init = function(params) {
        if(!params || params.id === undefined) {
            throw new Error('collab id required');
        }
        this.id = params.id;
    };
    
    /**
     * Subscribes to conference ready notifications coweb.site.ready.
     *
     * @param callback Function to invoke
     * @return Promise which always notifies success
     */
    proto.subscribeReady = function(context, callback) {
        if(callback === undefined) {
            callback = context;
            context = this;
        }
        if(typeof callback !== 'function') {
            callback = context[callback];
            if(typeof callback !== 'function') {
                throw new Error('callback must be a function');
            }
        }
        var topic = topics.READY;
        var tok = OpenAjax.hub.subscribe(topic, function(topic, params) {
            callback.call(context, params);
        }, this);
        this._tokens[tok] = null;
        var def = new Promise();
        def._cowebToken = tok;
        def.resolve();
        return def;
    };

    /**
     * Subscribes to conference ready notifications coweb.site.end.
     *
     * @param callback Function to invoke
     * @return Promise which always notifies success
     */
    proto.subscribeEnd = function(context, callback) {
        if(callback === undefined) {
            callback = context;
            context = this;
        }
        if(typeof callback !== 'function') {
            callback = context[callback];
            if(typeof callback !== 'function') {
                throw new Error('callback must be a function');
            }
        }
        var topic = topics.END;
        var tok = OpenAjax.hub.subscribe(topic, function(topic, params) {
            callback.call(context, params);
        }, this);
        this._tokens[tok] = null;
        var def = new Promise();
        def._cowebToken = tok;
        def.resolve();
        return def;
    };

    /**
     * Subscribes to site joining notifications coweb.site.join.
     *
     * @param callback Function to invoke
     * @return Promise which always notifies success
     */
    proto.subscribeSiteJoin = function(context, callback) {
        if(callback === undefined) {
            callback = context;
            context = this;
        }
        if(typeof callback !== 'function') {
            callback = context[callback];
            if(typeof callback !== 'function') {
                throw new Error('callback must be a function');
            }
        }
        var topic = topics.SITE_JOIN;
        var tok = OpenAjax.hub.subscribe(topic, function(topic, params) {
            callback.call(context, params);
        }, this);
        this._tokens[tok] = null;
        var def = new Promise();
        def._cowebToken = tok;
        def.resolve();
        return def;
    };

    /**
     * Subscribes to site leaving notifications coweb.site.leave.
     *
     * @param callback Function to invoke
     * @return Promise which always notifies success
     */
    proto.subscribeSiteLeave = function(context, callback) {
        if(callback === undefined) {
            callback = context;
            context = this;
        }
        if(typeof callback !== 'function') {
            callback = context[callback];
            if(typeof callback !== 'function') {
                throw new Error('callback must be a function');
            }
        }
        var topic = topics.SITE_LEAVE;
        var tok = OpenAjax.hub.subscribe(topic, function(topic, params) {
            callback.call(context, params);
        }, this);
        this._tokens[tok] = null;
        var def = new Promise();
        def._cowebToken = tok;
        def.resolve();
        return def;
    };

    /**
     * Sends an incremental state change event coweb.sync.<topic>.<id>.
     * Throws an exception if this instance is disconnected or not initialized.
     *
     * @param name String state name
     * @param value JSON-encodable value for the change
     * @param type String type of change or null
     * @param position Integer position of the change
     */
    proto.sendSync = function(name, value, type, position) {
        if(this.id === undefined) {
            throw new Error('call init() first');
        }
        if(type === undefined) {
            type = 'update';
        }
        if(position === undefined) {
            position = 0;
        }
        var topic = topics.SYNC+name+'.'+this.id;
        var params = {value: value, type: type, position:position};
        this._mutex = true;
        OpenAjax.hub.publish(topic, params);
        this._mutex = false;
    };
    
    /**
     * Subscribes to remote incremental state changes 
     * coweb.sync.<topic>.<id>. Throws an exception if this instance is 
     * not initialized.
     *
     * @param name String state name
     * @param callback Function to invoke
     * @return Promise which always notifies success
     */
    proto.subscribeSync = function(name, context, callback) {
        if(this.id === undefined) {
            throw new Error('call init() first');
        }
        if(!name) {
            throw new Error('valid sync name required');
        }
        if(callback === undefined) {
            callback = context;
            context = this;
        }
        if(typeof callback !== 'function') {
            callback = context[callback];
            if(typeof callback !== 'function') {
                throw new Error('callback must be a function');
            }
        }
        var topic = topics.SYNC+name+'.'+this.id;
        var tok = OpenAjax.hub.subscribe(topic, function(tp, params) {
            if(!this._mutex) {
                params.name = name;
                params.topic = tp;
                callback.call(context, params);
            }
        }, this);
        this._tokens[tok] = null;
        var def = new Promise();
        def._cowebToken = tok;
        def.resolve();
        return def;
    };
    
    /**
     * Subscribes to full state requests coweb.state.get.
     *
     * @param callback Function to invoke
     * @return Promise which always notifies success
     */
    proto.subscribeStateRequest = function(context, callback) {
        if(callback === undefined) {
            callback = context;
            context = this;
        }
        if(typeof callback !== 'function') {
            callback = context[callback];
            if(typeof callback !== 'function') {
                throw new Error('callback must be a function');
            }
        }
        var topic = topics.GET_STATE;
        var tok = OpenAjax.hub.subscribe(topic, function(topic, params) {
            callback.call(context, params);
        }, this);
        this._tokens[tok] = null;
        var def = new Promise();
        def._cowebToken = tok;
        def.resolve();
        return def;
    };
    
    /**
     * Sends a response to a full state request coweb.state.set.<id>.
     * Throws an exception if this instance is disconnected or not initialized.
     *
     * @param state JSON-encodable state data for the response
     * @param token String opaque token from the original request
     * @return Promise which always notifies success
     */
    proto.sendStateResponse = function(state, token) {
        if(this.id === undefined) {
            throw new Error('call init() first');
        }
        var params = {state : state, recipient : token};
        this._mutex = true;
        try {
            OpenAjax.hub.publish(topics.SET_STATE+this.id, params);
        } finally {
            this._mutex = false;
        }
    };

    /**
     * Subscribes to remote full state responses coweb.state.set.<id>.
     * Throws an exception if this instance is not initialized.
     *
     * @param callback Function to invoke
     * @return Promise which always notifies success
     */    
    proto.subscribeStateResponse = function(context, callback) {
        if(this.id === undefined) {
            throw new Error('call init() first');
        }
        if(callback === undefined) {
            callback = context;
            context = this;
        }
        if(typeof callback !== 'function') {
            callback = context[callback];
            if(typeof callback !== 'function') {
                throw new Error('callback must be a function');
            }
        }
        var topic = topics.SET_STATE+this.id;
        var tok = OpenAjax.hub.subscribe(topic, function(t, params) {
            if(!this._mutex) {
                callback.call(context, params);
            }
        }, this);
        this._tokens[tok] = null;
        var def = new Promise();
        def._cowebToken = tok;
        def.resolve();
        return def;
    };

    /**
     * Subscribes to a service with coweb.service.sub.<service>
     * and responses coweb.service.set.<service>.
     * Throws an exception if this instance is disconnected or not initialized.
     *
     * @param service String name of the service
     * @param callback Function to invoke or a token from a previous call
     *   subscribeService indicating a callback to reuse
     * @return Promise which always notifies success
     */
    proto.subscribeService = function(service, context, callback) {
        if(callback === undefined) {
            callback = context;
            context = this;
        }
        if(typeof callback !== 'function') {
            callback = context[callback];
            if(typeof callback !== 'function') {
                throw new Error('callback must be a function');
            }
        }
        // build the service response topic
        var setTopic = topics.SET_SERVICE+service;

        // register internal callback for service response
        var subData = {
            callback : callback, 
            context : context, 
            type : 'subscribe'
        };
        var hubToken = OpenAjax.hub.subscribe(setTopic, 
            '_cowebServiceResponse', this, subData);

        // add metadata and data to the subscription request
        var msg = {topic : setTopic, service : service};
        // send subscription request
        var subTopic = topics.SUB_SERVICE+service;
        OpenAjax.hub.publish(subTopic, msg);

        // save all info needed to unregister
        var cowebToken = {topic : setTopic, service : service, 
            hubToken : hubToken};
        this._tokens[hubToken] = cowebToken;
        
        var def = new Promise();
        def.resolve();
        def._cowebToken = cowebToken;
        return def;
    };
    
    /**
     * Requests a single service value with coweb.service.get.<service>
     * and response coweb.service.set.<service>_<request id>.<id>.
     * Throws an exception if this instance is disconnected or not initialized.
     *
     * @param service String name of the service
     * @param params JSON-encodable parameters to configure the service
     * @param callback Function to invoke
     * @return Promise which always notifies success
     */    
    proto.postService = function(service, params, context, callback) {
        if(this.id === undefined) {
            throw new Error('call init() first');
        }
        if(callback === undefined) {
            callback = context;
            context = this;
        }
        if(typeof callback !== 'function') {
            callback = context[callback];
            if(typeof callback !== 'function') {
                throw new Error('callback must be a function');
            }
        }
        // subscribe to response event
        var setTopic = topics.SET_SERVICE+service+'_'+this._serviceId+'.'+this.id;
        // use our callback so we can automatically unregister 
        var subData = {
            context : context,
            callback : callback, 
            type : 'get'
        };
        var hubToken = OpenAjax.hub.subscribe(setTopic, 
            '_cowebServiceResponse', this, subData);
        // track token for unsubscribeAll
        this._tokens[hubToken] = null;            
        // add the unsubscribe token to the subscriber data so we have it
        // when the callback is invoked
        subData.hubToken = hubToken;
        // add metadata and data to message
        var msg = {topic : setTopic, params : params, service : service};
        // send get request to listener
        var get_topic = topics.GET_SERVICE+service;
        OpenAjax.hub.publish(get_topic, msg);
        // make next request unique
        this._serviceId++;
        var def = new Promise();
        def.resolve();
        def._cowebToken = hubToken;
        return def;
    };

    /**
     * Handles a service response. Unsubscribes a get request after delivering
     * data to its callback.
     *
     * @param topic String response topic coweb.service.set.**
     * @param params Object with value, type, position, and site
     * @return Promise which always notifies success
     */
    proto._cowebServiceResponse = function(topic, params, subData) {
        var hubToken = subData.hubToken;
        // invoke the real callback
        try {
            subData.callback.call(subData.context, params);
        } finally {
            if(subData.type === 'get') {
                // unsubscribe from hub
                OpenAjax.hub.unsubscribe(subData.hubToken);
                // stop tracking token
                delete this._tokens[hubToken];
            }
        }
    };

    /**
     * Unsubscribes any subscription created via this interface.
     *
     * @param def Promise returned by the method that created the
     *   subscription
     */
    proto.unsubscribe = function(def) {
        var token, i;
        if(!def) { 
            return;
        } else if(def._cowebToken && def._cowebToken.hubToken) {
            token = def._cowebToken;
            // don't allow reuse of token
            delete def._cowebToken;
            // unsubscribe from local event
            OpenAjax.hub.unsubscribe(token.hubToken);
            // remove from tracked tokens
            delete this._tokens[token.hubToken];
            // send unsubscribe request to listener
            var topic = topics.UNSUB_SERVICE+token.service;
            // include original topic
            OpenAjax.hub.publish(topic, token);
        } else if(def._cowebToken) {        
            token = def._cowebToken;
            // don't allow reuse of token
            delete def._cowebToken;
            // remove from tracked tokens
            delete this._tokens[token];
            OpenAjax.hub.unsubscribe(token);
        }
    };
    
    /**
     * Removes all subscriptions created via this interface.
     */
    proto.unsubscribeAll = function() {
        for(var hubToken in this._tokens) {
            if(this._tokens.hasOwnProperty(hubToken)) {
                var cowebToken = this._tokens[hubToken];
                // unsubscribe
                OpenAjax.hub.unsubscribe(hubToken);
                // stop tracking
                delete this._tokens[hubToken];
                if(cowebToken) {
                    // unregister from service too
                    var topic = topics.UNSUB_SERVICE+cowebToken.service;
                    // include original topic
                    OpenAjax.hub.publish(topic, cowebToken);
                }
            }
        }
    };
    
    return UnmanagedHubCollab;
});
