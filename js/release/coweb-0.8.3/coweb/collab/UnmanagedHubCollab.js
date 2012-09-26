//
// Unmanaged OpenAjax Hub implementation of the CollabInterface.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*jslint white:false, bitwise:true, eqeqeq:true, immed:true, nomen:false, 
  onevar:false, plusplus:false, undef:true, browser:true, devel:true, 
  forin:false, sub:false*/
/*global define*/
define([
    'coweb/topics',
    'coweb/util/Promise',
    'org/OpenAjax',
	'org/requirejs/i18n!../nls/messages'
], function(topics, Promise, OpenAjax, messages) {
    /**
     * @constructor
     */
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
     * @param {String} params.id Unique identifier of this wrapper / widget
     */    
    proto.init = function(params) {
        if(!params || params.id === undefined) {
            throw new Error(messages.nocollabid);
        }
        this.id = params.id;
    };
    
    /**
     * Subscribes to session ready notifications coweb.site.ready.
     *
     * @param {Object|Function} context Context in which to invoke the callback
     * or the callback itself
     * @param {Function|String} callback Function to invoke if context
     * specified
     * @returns {Promise} Always notifies success because this impl is
     * synchronous
     */
    proto.subscribeReady = function(context, callback) {
        if(callback === undefined) {
            callback = context;
            context = this;
        }
        if(typeof callback !== 'function') {
            callback = context[callback];
            if(typeof callback !== 'function') {
                throw new Error(messages.callbackfunction);
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
     * Subscribes to session end notifications coweb.site.end.
     *
     * @param {Object|Function} context Context in which to invoke the callback
     * or the callback itself
     * @param {Function|String} callback Function to invoke if context
     * specified
     * @returns {Promise} Always notifies success because this impl is
     * synchronous
     */
    proto.subscribeEnd = function(context, callback) {
        if(callback === undefined) {
            callback = context;
            context = this;
        }
        if(typeof callback !== 'function') {
            callback = context[callback];
            if(typeof callback !== 'function') {
                throw new Error(messages.callbackfunction);
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
     * @param {Object|Function} context Context in which to invoke the callback
     * or the callback itself
     * @param {Function|String} callback Function to invoke if context
     * specified
     * @returns {Promise} Always notifies success because this impl is
     * synchronous
     */
    proto.subscribeSiteJoin = function(context, callback) {
        if(callback === undefined) {
            callback = context;
            context = this;
        }
        if(typeof callback !== 'function') {
            callback = context[callback];
            if(typeof callback !== 'function') {
                throw new Error(messages.callbackfunction);
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
     * @param {Object|Function} context Context in which to invoke the callback
     * or the callback itself
     * @param {Function|String} callback Function to invoke if context
     * specified
     * @returns {Promise} Always notifies success because this impl is
     * synchronous
     */
    proto.subscribeSiteLeave = function(context, callback) {
        if(callback === undefined) {
            callback = context;
            context = this;
        }
        if(typeof callback !== 'function') {
            callback = context[callback];
            if(typeof callback !== 'function') {
                throw new Error(messages.callbackfunction);
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
     * Throws an exception if this instance is not initialized.
     *
     * @param {String} name Cooperative event name
     * @param {Object} value JSON-encodable value for the change
     * @param {String|null} [type='update'] Type of change or null
     * @param {Number} [position=0] Integer position of the change
     */
    proto.sendSync = function(name, value, type, position) {
        if(this.id === undefined) {
            throw new Error(messages.callinitfirst);
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
     * @param {String} name Cooperative event name
     * @param {Object|Function} context Context in which to invoke the callback
     * or the callback itself
     * @param {Function|String} callback Function to invoke if context
     * specified
     * @returns {Promise} Always notifies success because this impl is
     * synchronous
     */
    proto.subscribeSync = function(name, context, callback) {
        if(this.id === undefined) {
            throw new Error(messages.callinitfirst);
        }
        if(!name) {
            throw new Error(messages.validsyncname);
        }
        if(callback === undefined) {
            callback = context;
            context = this;
        }
        if(typeof callback !== 'function') {
            callback = context[callback];
            if(typeof callback !== 'function') {
                throw new Error(messages.callbackfunction);
            }
        }
        var topic = topics.SYNC+name+'.'+this.id;
        var ls = topics.SYNC.length,
            le = this.id.length+1;
        var tok = OpenAjax.hub.subscribe(topic, function(tp, params) {
            if(!this._mutex) {
                // compute the actual event name, not what was registered
                // because it may have had wildcards
                params.name = tp.substring(ls, tp.length-le);
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
     * @param {Object|Function} context Context in which to invoke the callback
     * or the callback itself
     * @param {Function|String} callback Function to invoke if context
     * specified
     * @returns {Promise} Always notifies success because this impl is
     * synchronous
     */
    proto.subscribeStateRequest = function(context, callback) {
        if(callback === undefined) {
            callback = context;
            context = this;
        }
        if(typeof callback !== 'function') {
            callback = context[callback];
            if(typeof callback !== 'function') {
                throw new Error(messages.callbackfunction);
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
     * Throws an exception if this instance is not initialized.
     *
     * @param {Object} state JSON-encodable state data for the response
     * @param {String} token Opaque token from the original state request
     */
    proto.sendStateResponse = function(state, token) {
        if(this.id === undefined) {
            throw new Error(messages.callinitfirst);
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
     * @param {Object|Function} context Context in which to invoke the callback
     * or the callback itself
     * @param {Function|String} callback Function to invoke if context
     * specified
     * @returns {Promise} Always notifies success because this impl is
     * synchronous
     */    
    proto.subscribeStateResponse = function(context, callback) {
        if(this.id === undefined) {
            throw new Error(messages.callinitfirst);
        }
        if(callback === undefined) {
            callback = context;
            context = this;
        }
        if(typeof callback !== 'function') {
            callback = context[callback];
            if(typeof callback !== 'function') {
                throw new Error(messages.callbackfunction);
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
     * Throws an exception if this instance is not initialized.
     *
     * @param {String} service Name of the service
     * @param {Object|Function} context Context in which to invoke the callback
     * or the callback itself
     * @param {Function|String} callback Function to invoke if context
     * specified
     * @returns {Promise} Always notifies success because this impl is
     * synchronous
     */
    proto.subscribeService = function(service, context, callback) {
        if(callback === undefined) {
            callback = context;
            context = this;
        }
        if(typeof callback !== 'function') {
            callback = context[callback];
            if(typeof callback !== 'function') {
                throw new Error(messages.callbackfunction);
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
     * Throws an exception if this instance is not initialized.
     *
     * @param {String} service Name of the service
     * @param {Object} params JSON-encodable parameters to pass to the service
     * @param {Object|Function} context Context in which to invoke the callback
     * or the callback itself
     * @param {Function|String} callback Function to invoke if context
     * specified
     * @returns {Promise} Always notifies success because this impl is
     * synchronous
     */    
    proto.postService = function(service, params, context, callback) {
        if(this.id === undefined) {
            throw new Error(messages.callinitfirst);
        }
        if(callback === undefined) {
            callback = context;
            context = this;
        }
        if(typeof callback !== 'function') {
            callback = context[callback];
            if(typeof callback !== 'function') {
                throw new Error(messages.callbackfunction);
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
     * Handles a service response. Unsubscribes a postService request after 
     * delivering data to its callback.
     *
     * @private
     * @param {String} topic Response topic coweb.service.set.**
     * @param {Object} params Cooperative event
     * @returns {Promise} Always notifies success because this impl is
     * synchronous
     */
    proto._cowebServiceResponse = function(topic, params, subData) {
        var hubToken = subData.hubToken;
        // invoke the real callback
        var args = {value : params.value, error: params.error};
        try {
            subData.callback.call(subData.context, args);
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
     * @param {Promise} def Promise returned by the method that created the
     * subscription
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

    /**
     * Pause the syncing of incoming operations. The application of any incoming
     * operations will be delayed until `resumeSync` is called.
     */
    proto.pauseSync = function() {
        OpenAjax.hub.publish(topics.PAUSE_TOPIC, true);
    };

    /**
     * Resume syncing the incoming operations. Any incoming operations that were
     * delayed while the pause was in effect will now be applied.
     */
    proto.resumeSync = function() {
        OpenAjax.hub.publish(topics.RESUME_TOPIC, true);
    };

    return UnmanagedHubCollab;
});
