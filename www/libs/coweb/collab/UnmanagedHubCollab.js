//
// Unmanaged OpenAjax Hub implementation of the CollabInterface.
//
// @todo: dojo replacement
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
        this.mutex = false;
        this.service_id = 0;
        this.tokens = [];
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
    proto.subscribeConferenceReady = function(context, callback) {
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
        this.tokens.push(tok);
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
    proto.subscribeConferenceEnd = function(context, callback) {
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
        this.tokens.push(tok);
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
        this.tokens.push(tok);
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
        this.tokens.push(tok);
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
        this.mutex = true;
        OpenAjax.hub.publish(topic, params);
        this.mutex = false;
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
            if(!this.mutex) {
                callback.call(context, tp, params.value, params.type, 
                    params.position, params.site);
            }
        }, this);
        this.tokens.push(tok);
        var def = new Promise();
        def._cowebToken = tok;
        def.resolve();
        return def;
    };
    
    /**
     * Gets the application-defined state name from the full topic name sent by
     * sendSync and received by a subscribeSync callback.
     *
     * @param topic String response topic coweb.sync.**
     * @return String state name
     */
    proto.getSyncNameFromTopic = function(topic) {
         return topic.substring(topics.SYNC.length, 
             topic.length-this.id.length-1);
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
        this.tokens.push(tok);
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
        this.mutex = true;
        try {
            OpenAjax.hub.publish(topics.SET_STATE+this.id, params);
        } catch(e) {
            this.mutex = false;
            throw e;
        }
        this.mutex = false;
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
            if(!this.mutex) {
                callback.call(context, params);
            }
        }, this);
        this.tokens.push(tok);
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
        var set_topic = topics.SET_SERVICE+service;

        // register internal callback for service response
        var sub_data = {
            callback : callback, 
            context : context, 
            type : 'subscribe'
        };
        var token = OpenAjax.hub.subscribe(set_topic, dojo.hitch(this,
            '_cowebServiceResponse'), null, sub_data);
        this.tokens.push(token);

        // add metadata and data to the subscription request
        var msg = {topic : set_topic, service : service};
        // send subscription request
        var sub_topic = topics.SUB_SERVICE+service;
        OpenAjax.hub.publish(sub_topic, msg);

        // save all info needed to unregister
        var coweb_token = {topic : set_topic, service : service, 
            hub_token : token};
        var def = new Promise();
        def.resolve();
        def._cowebToken = coweb_token;
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
        var set_topic = topics.SET_SERVICE+service+'_'+this.service_id+'.'+this.id;
        // use our callback so we can automatically unregister 
        var sub_data = {
            context : context,
            callback : callback, 
            type : 'get'
        };
        var token = OpenAjax.hub.subscribe(set_topic, dojo.hitch(this, 
            '_cowebServiceResponse'), null, sub_data);
        this.tokens.push(token);
        // add the unsubscribe token to the subscriber data so we have it
        // when the callback is invoked
        sub_data.hub_token = token;
        // add metadata and data to message
        var msg = {topic : set_topic, params : params, service : service};
        // send get request to listener
        var get_topic = topics.GET_SERVICE+service;
        OpenAjax.hub.publish(get_topic, msg);
        // make next request unique
        this.service_id++;
        var def = new Promise();
        def.resolve();
        def._cowebToken = token;
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
    proto._cowebServiceResponse = function(topic, params, sub_data) {
        // invoke the real callback
        try {
            sub_data.callback.call(sub_data.context, params.value, params.error);
        } catch(e) {
            if(sub_data.type == 'get') {
                // unsubscribe using token
                OpenAjax.hub.unsubscribe(sub_data.hub_token);
            }
            // re-raise error
            throw e;
        }
        if(sub_data.type == 'get') {
            // unsubscribe using token
            OpenAjax.hub.unsubscribe(sub_data.hub_token);
        }
    };

    /**
     * Unsubscribes any subscription created via this interface.
     *
     * @param def Promise returned by the method that created the
     *   subscription
     */
    proto.unsubscribe = function(def) {
        if(!def) { 
            return;
        } else if(def._cowebToken && def._cowebToken.hub_token) {
            var token = def._cowebToken;
            // don't allow reuse of token
            delete def._cowebToken;
            // unsubscribe from local event
            OpenAjax.hub.unsubscribe(token.hub_token);
            // remove from tracked tokens
            var i = dojo.indexOf(this.tokens, token.hub_token);
            this.tokens = this.tokens.slice(0, i).concat(this.tokens.slice(i+1));
            // send unsubscribe request to listener
            var topic = topics.UNSUB_SERVICE+token.service;
            // include original topic
            OpenAjax.hub.publish(topic, token);
        } else if(def._cowebToken) {        
            OpenAjax.hub.unsubscribe(def._cowebToken);
            // don't allow reuse of token
            delete def._cowebToken;
            // remove from tracked tokens
            var i = dojo.indexOf(this.tokens, token.hub_token);
            this.tokens = this.tokens.slice(0, i).concat(this.tokens.slice(i+1));
        }
    };
    
    /**
     * Removes all subscriptions created via this interface.
     */
    proto.unsubscribeAll = function() {
        for(var i=0, l=this.tokens.length; i < l; i++) {
            OpenAjax.hub.unsubscribe(this.tokens[i]);
        }
    };
    
    return UnmanagedHubCollab;
});
