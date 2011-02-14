//
// Unmanaged OpenAjax Hub implementation of the CollabInterface.
//
// @todo: dojo replacement
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
define(function() {
    // detect OpenAjax Hub 1.0
    var version;
    try {
        version = OpenAjax.hub.implVersion;
        if(version !== '1.0' && version !== '0.6') {
            throw new Error();
        }
    } catch(e) {
        // throw an error; need Hub for all of our implementations
        throw new Error('OpenAjax Hub 1.0 not loaded');
    }

    var UnmanagedHubCollab = function() {
        this.mutex = false;
        this.service_id = 0;
        this.tokens = [];
    };
    // save the finger joints
    var methods = UnmanagedHubCollab.prototype;

    /**
     * Stores the collaboration instance ID.
     *
     * @param params Parameter given to the collab wrapper factory function
     */    
    methods.init = function(params) {
        if(params.id === undefined) {
            throw new Error('collab id required');
        }
        this.id = params.id;
    };
    
    /**
     * Subscribes to conference ready notifications coweb.site.ready.
     *
     * @param callback Function to invoke
     * @return dojo.Deferred which always notifies success
     */
    methods.subscribeConferenceReady = function(context, callback) {
        if(callback === undefined) {
            callback = context;
            context = this;
        }
        if(dojo.isString(callback)) {
            callback = context[callback];
        }
        var topic = coweb.READY;
        var tok = OpenAjax.hub.subscribe(topic, dojo.hitch(this,
            function(topic, params) {
                callback.call(context, params);
            })
        );
        this.tokens.push(tok);
        var def = new dojo.Deferred();
        def._cowebToken = tok;
        def.callback();
        return def;
    };

    /**
     * Subscribes to conference ready notifications coweb.site.end.
     *
     * @param callback Function to invoke
     * @return dojo.Deferred which always notifies success
     */
    methods.subscribeConferenceEnd = function(context, callback) {
        if(callback === undefined) {
            callback = context;
            context = this;
        }
        if(dojo.isString(callback)) {
            callback = context[callback];
        }
        var topic = coweb.END;
        var tok = OpenAjax.hub.subscribe(topic, dojo.hitch(this,
            function(topic, params) {
                callback.call(context, params);
            })
        );
        this.tokens.push(tok);
        var def = new dojo.Deferred();
        def._cowebToken = tok;
        def.callback();
        return def;
    };

    /**
     * Subscribes to site joining notifications coweb.site.join.
     *
     * @param callback Function to invoke
     * @return dojo.Deferred which always notifies success
     */
    methods.subscribeSiteJoin = function(context, callback) {
        if(callback === undefined) {
            callback = context;
            context = this;
        }
        if(dojo.isString(callback)) {
            callback = context[callback];
        }
        var topic = coweb.SITE_JOIN;
        var tok = OpenAjax.hub.subscribe(topic, dojo.hitch(this,
            function(topic, params) {
                callback.call(context, params);
            })
        );
        this.tokens.push(tok);
        var def = new dojo.Deferred();
        def._cowebToken = tok;
        def.callback();
        return def;
    };

    /**
     * Subscribes to site leaving notifications coweb.site.leave.
     *
     * @param callback Function to invoke
     * @return dojo.Deferred which always notifies success
     */
    methods.subscribeSiteLeave = function(context, callback) {
        if(callback === undefined) {
            callback = context;
            context = this;
        }
        if(dojo.isString(callback)) {
            callback = context[callback];
        }
        var topic = coweb.SITE_LEAVE;
        var tok = OpenAjax.hub.subscribe(topic, dojo.hitch(this,
            function(topic, params) {
                callback.call(context, params);
            })
        );
        this.tokens.push(tok);
        var def = new dojo.Deferred();
        def._cowebToken = tok;
        def.callback();
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
    methods.sendSync = function(name, value, type, position) {
        if(this.id === null) {
            throw new Error('collab API uninitialized - call init first');
        }
        if(typeof(type) == 'undefined') {
            type = 'update';
        }
        if(typeof(position) == 'undefined') {
            position = 0;
        }
        var topic = coweb.SYNC+name+'.'+this.id;
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
     * @return dojo.Deferred which always notifies success
     */
    methods.subscribeSync = function(name, context, callback) {
        if(this.id === null) {
            throw new Error('collab API uninitialized - call init first');
        }
        if(callback === undefined) {
            callback = context;
            context = this;
        }
        if(dojo.isString(callback)) {
            callback = context[callback];
        }
        var topic = coweb.SYNC+name+'.'+this.id;
        var tok = OpenAjax.hub.subscribe(topic, dojo.hitch(this,
            function(tp, params) {
                if(!this.mutex) {
                    callback.call(context, tp, params.value, params.type, 
                        params.position, params.site);
                }
            })
        );
        this.tokens.push(tok);
        var def = new dojo.Deferred();
        def._cowebToken = tok;
        def.callback();
        return def;
    };
    
    /**
     * Gets the application-defined state name from the full topic name sent by
     * sendSync and received by a subscribeSync callback.
     *
     * @param topic String response topic coweb.sync.**
     * @return String state name
     */
    methods.getSyncNameFromTopic = function(topic) {
         return topic.substring(coweb.SYNC.length, 
             topic.length-this.id.length-1);
    };
    
    /**
     * Subscribes to full state requests coweb.state.get.
     *
     * @param callback Function to invoke
     * @return dojo.Deferred which always notifies success
     */
    methods.subscribeStateRequest = function(context, callback) {
        if(callback === undefined) {
            callback = context;
            context = this;
        }
        if(dojo.isString(callback)) {
            callback = context[callback];
        }
        var topic = coweb.GET_STATE;
        var tok = OpenAjax.hub.subscribe(topic, dojo.hitch(this,
            function(topic, params) {
                callback.call(context, params);
            })
        );
        this.tokens.push(tok);
        var def = new dojo.Deferred();
        def._cowebToken = tok;
        def.callback();
        return def;
    };
    
    /**
     * Sends a response to a full state request coweb.state.set.<id>.
     * Throws an exception if this instance is disconnected or not initialized.
     *
     * @param state JSON-encodable state data for the response
     * @param token String opaque token from the original request
     * @return dojo.Deferred which always notifies success
     */
    methods.sendStateResponse = function(state, token) {
        if(this.id === null) {
            throw new Error('collab API uninitialized - call init first');
        }
        var params = {state : state, recipient : token};
        this.mutex = true;
        try {
            OpenAjax.hub.publish(coweb.SET_STATE+this.id, params);
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
     * @return dojo.Deferred which always notifies success
     */    
    methods.subscribeStateResponse = function(context, callback) {
        if(this.id === null) {
            throw new Error('collab API uninitialized - call init first');
        }
        if(callback === undefined) {
            callback = context;
            context = this;
        }
        if(dojo.isString(callback)) {
            callback = context[callback];
        }
        var topic = coweb.SET_STATE+this.id;
        var tok = OpenAjax.hub.subscribe(topic, dojo.hitch(this,
            function(t, params) {
                if(!this.mutex) {
                    callback.call(context, params);
                }
            })
        );
        this.tokens.push(tok);
        var def = new dojo.Deferred();
        def._cowebToken = tok;
        def.callback();
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
     * @return dojo.Deferred which always notifies success
     */
    methods.subscribeService = function(service, context, callback) {
        if(this.id === null) {
            throw new Error('collab API uninitialized - call init first');
        }
        if(callback === undefined) {
            callback = context;
            context = this;
        }
        if(dojo.isString(callback)) {
            callback = context[callback];
        }

        // build the service response topic
        var set_topic = coweb.SET_SERVICE+service;

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
        var sub_topic = coweb.SUB_SERVICE+service;
        OpenAjax.hub.publish(sub_topic, msg);

        // save all info needed to unregister
        var coweb_token = {topic : set_topic, service : service, 
            hub_token : token};
        var def = new dojo.Deferred();
        def.callback();
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
     * @return dojo.Deferred which always notifies success
     */    
    methods.postService = function(service, params, context, callback) {
        if(this.id === null) {
            throw new Error('collab API uninitialized - call init first');
        }
        if(callback === undefined) {
            callback = context;
            context = this;
        }
        if(dojo.isString(callback)) {
            callback = context[callback];
        }
        // subscribe to response event
        var set_topic = coweb.SET_SERVICE+service+'_'+this.service_id+'.'+this.id;
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
        var get_topic = coweb.GET_SERVICE+service;
        OpenAjax.hub.publish(get_topic, msg);
        // make next request unique
        this.service_id++;
        var def = new dojo.Deferred();
        def.callback();
        def._cowebToken = token;
        return def;
    };

    /**
     * Handles a service response. Unsubscribes a get request after delivering
     * data to its callback.
     *
     * @param topic String response topic coweb.service.set.**
     * @param params Object with value, type, position, and site
     * @return dojo.Deferred which always notifies success
     */
    methods._cowebServiceResponse = function(topic, params, sub_data) {
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
     * @param def dojo.Deferred returned by the method that created the
     *   subscription
     */
    methods.unsubscribe = function(def) {
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
            var topic = coweb.UNSUB_SERVICE+token.service;
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
    methods.unsubscribeAll = function() {
        for(var i=0, l=this.tokens.length; i < l; i++) {
            OpenAjax.hub.unsubscribe(this.tokens[i]);
        }
    };
    
    return UnmanagedHubCollab;
});
