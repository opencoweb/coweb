//
// Cooperative web package root.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*jslint white:false, bitwise:true, eqeqeq:true, immed:true, nomen:false, 
  onevar:false, plusplus:false, undef:true, browser:true, devel:true, 
  forin:false, sub:false*/
/*global define cowebConfig*/
if(typeof cowebConfig === 'undefined') {
    var cowebConfig = {};
}

// mix defaults into coweb config where left undefined
cowebConfig = {
    sessionImpl : cowebConfig.sessionImpl || 'coweb/session/BayeuxSession',
    listenerImpl : cowebConfig.listenerImpl || 'coweb/listener/UnmanagedHubListener',
    collabImpl : cowebConfig.collabImpl || 'coweb/collab/UnmanagedHubCollab',
    debug : cowebConfig.debug || false,
    baseUrl : cowebConfig.baseUrl || '',
    adminUrl : cowebConfig.adminUrl || '/admin',
    loginUrl : cowebConfig.loginUrl || '/login',
    logoutUrl : cowebConfig.logoutUrl || '/logout',
    cacheState : cowebConfig.cacheState || false
};

define('coweb/main',[
    cowebConfig.sessionImpl,
    cowebConfig.listenerImpl,
    cowebConfig.collabImpl
], function(SessionImpl, ListenerImpl, CollabImpl) {
    // session and listener instance singletons
    var sessionInst = null,
        listenerInst = null,
        urlNames = ['adminUrl', 'loginUrl', 'logoutUrl'],
        name, value, base, noop, i, l;

    // define a dummy console for error logging if not provided
    if(typeof console === 'undefined') {
        noop = function() {};
        console = {};
        console.error = 
        console.warn = 
        console.log = 
        console.info = 
        console.debug = noop;
    }
    
    if(cowebConfig.baseUrl) {
        // adjust abs urls relative to base
        for(i=0, l=urlNames.length; i<l; i++) {
            name = urlNames[i];
            value = cowebConfig[urlNames[i]];
            if(value.charAt(0) === '/') {
                cowebConfig[name] = cowebConfig.baseUrl + value;
            }
        }
    }

    // factory interface
    return {
        VERSION : '0.6',

        /**
         * Get the singleton cowebConfig.sessionImpl implementation of 
         * SessionInterface.
         *
         * @return SessionInterface
         */
        initSession : function() {
            if(sessionInst) {
                // return singleton session instance
                return sessionInst;
            }
            // create the session instance
            sessionInst = new SessionImpl();
            // create the listener instance
            listenerInst = new ListenerImpl();
            // initialize the session
            sessionInst.init(cowebConfig, listenerInst);
            return sessionInst;
        },

        /**
         * Get an instance of cowebConfig.collabImpl, the configured 
         * implementation of CollaborationInterface.
         *
         * @param {Object} params Configuration parameters
         */
        initCollab: function(params) {
            params = params || {};
            var collabInst = new CollabImpl();
            collabInst.init(params);
            return collabInst;
        },
        
        /**
         * Destroys the SessionInterface singleton.
         */
        reset: function() {
            if(sessionInst) {
                sessionInst.destroy();
            }
            sessionInst = null;
        }
    };
});//
// Lightweight promises implementation loosely based on 
// http://wiki.commonjs.org/wiki/Promises/A and the dojo.Deferred 
// implementation.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
//
/*jslint white:false, bitwise:true, eqeqeq:true, immed:true, nomen:false, 
  onevar:false, plusplus:false, undef:true, browser:true, devel:true, 
  forin:false, sub:false*/
/*global define*/
define('coweb/util/Promise',['require','exports','module'],function() {
    /**
     * @class Promise
     * @constructor
     */
    var Promise = function() {
        // immutable properties
        var currListener, lastListener, result, errored, fulfilled;

        /**
         * Notify all listeners of the promise of success or failure.
         * 
         * @private
         * @returns {Boolean} True if any listener threw an uncaught error
         */
        var notifyListeners = function() {
            var func, rv, nextVal, ptr, unexpectedError = false;
            var success = function(ptr) {
                var promise = ptr.promise;
                return function(val) {
                    promise.resolve(val);
                };
            };
            var failure = function(err) {
                var promise = ptr.promise;
                return function(err) {                    
                    promise.fail(err);
                };
            };
            while(currListener) {
                ptr = currListener;
                currListener = currListener.next;
                func = (errored) ? ptr.errback : ptr.callback;
                if(func) {
                    // have a registered function for notification
                    try {
                        rv = func.call(ptr.context || this, result);
                        if(rv && typeof rv.then === 'function') {
                            // function returned a new promise
                            rv.then(success(ptr), failure(ptr), ptr.context);
                            continue;
                        }
                        // keep current value or use next
                        nextVal = (rv === undefined) ? result : rv;
                        if(rv instanceof Error) {
                            ptr.promise.fail(nextVal);
                        } else {
                            ptr.promise.resolve(nextVal);
                        }
                    } catch(e) {
                        if(typeof console !== 'undefined' && console.error) {
                            console.error(e, func);
                        }
                        // some registered function failed
                        ptr.promise.fail(e);
                        unexpectedError = true;
                    }
                } else {
                    // no registered function for notification
                    if(errored) {
                        ptr.promise.fail(result);
                    } else {
                        ptr.promise.resolve(result);
                    }
                }
            }
            return unexpectedError;
        };

        /**
         * Register listener(s) for promise resolution or failure.
         *
         * @param {Function} callback Invoked on resolution
         * @param {Function} errback Invoke on failure
         * @param {Object} context Optional context in which callback or 
         * errback is called
         * @returns {Promise} New promise of this promise's callback / 
         * errback resolution or failure  
         */
        this.then = function(callback, errback, context) {
            if(callback && typeof callback !== 'function') {
                callback = context[callback];
                if(typeof callback !== 'function') {
                    throw new Error('callback must be a function');
                }
            }
            if(errback && typeof errback !== 'function') {
                errback = context[errback];
                if(typeof errback !== 'function') {
                    throw new Error('errback must be a function');
                }
            }
            var listener = {
                callback : callback,
                errback : errback,
                context : context,
                promise : new Promise()
            };
            if(currListener) {
                // attach this listener as next
                lastListener.next = listener;
                // this listener is now the last
                lastListener = listener;
            } else {
                // no listeners yet, this is the first
                currListener = lastListener = listener;
            }
            if(fulfilled) {
                notifyListeners();
            }
            return listener.promise;
        };

        /**
         * Resolve the promise.
         *
         * @param {any} value Any value
         * @return True if any listener threw an uncaught error
         */
        this.resolve = function(value) {
            if(fulfilled) {
                throw new Error('promise already resolved');
            }
            fulfilled = true;
            result = value;
            return notifyListeners();
        };

        /**
         * Fail the promise.
         *
         * @param {Error} err Error object
         * @return True if any listener threw an uncaught error
         */
        this.fail = function(err) {
            if(fulfilled) {
                throw new Error('promise already resolved');
            }
            fulfilled = true;
            errored = true;
            result = err;
            return notifyListeners();
        };
    };

    return Promise;
});//
// Simple XHR for browser environments.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
//
/*jslint white:false, bitwise:true, eqeqeq:true, immed:true, nomen:false, 
  onevar:false, plusplus:false, undef:true, browser:true, devel:true, 
  forin:false, sub:false*/
/*global define window*/
define('coweb/util/xhr',['coweb/util/Promise'], function(Promise) {
    /**
     * @private
     */
    var _setHeaders = function(xhr, headers) {
        if(headers) {
            for (var headerName in headers) {
                if(headers.hasOwnProperty(headerName)) {
                    xhr.setRequestHeader(headerName, headers[headerName]);                    
                }
            }
        }
    };

    return {
        /**
         * Do an XHR request. The function extends the passed args with an
         * "xhr" property containing the browser XMLHttpRequest object.
         *
         * @param {String} args.url Target url
         * @param {Boolean} [args.sync=false] True to send synchronously
         * @param {String} args.method POST, GET, etc.
         * @param {String} args.body Body of the request
         * @param {String} args.headers Key/value HTTP headers
         * @returns {Promise} Resolve or fail on XHR completion with the 
         * extended args as the value
         */
        send: function(args) {
            // build a promise
            var promise = new Promise();
            // build xhr object
            var xhr = new XMLHttpRequest();
            // stash the xhr on the promise object and the args
            args.xhr = promise.xhr = xhr;
            // attach to ready state change
            xhr.onreadystatechange = function(event) {
                // get event and ready state
                event = event || window.event;
                var rs = xhr.readyState;
                // check if complete
                if(rs === 4) {
                    // protect against dupe calls
                    xhr.onreadystatechange = function() {};
                    // check status
                    var stat;
                    try {
                        stat = xhr.status || 0;
                    } catch(e) {
                        // IE9 throws error when touching aborted xhr
                        stat = 0;
                    }
                    if((stat >= 200 && stat < 300) || 
                        // success is any 200 or a 304 from cache or an IE 1223
                        stat === 304 || stat === 1223) {
                        promise.resolve(args);
                    } else {
                        // error on everything else
                        args.error = new Error('failed loading '+args.url+' status:'+stat);
                        promise.fail(args);
                    }
                }
            };
            // do all ops in try/catch to report all errors
            try {
                xhr.open(args.method, args.url, args.sync !== true);
                _setHeaders(xhr, args.headers);
                xhr.send(args.body || null);
            } catch(e) {
                args.onError('failed sending xhr to '+args.url, e);
                throw e;
            }
            return promise;
        }
    };
});define('org/cometd',['require','exports','module'],function () {
/**
 * Dual licensed under the Apache License 2.0 and the MIT license.
 * $Revision: 1536 $ $Date: 2010-11-09 19:30:34 +0100 (Tue, 09 Nov 2010) $
 */

if (typeof dojo !== 'undefined')
{
    dojo.provide('org.cometd');
}
else
{
    // Namespaces for the cometd implementation
    this.org = this.org || {};
    org.cometd = {};
}

org.cometd.JSON = {};
org.cometd.JSON.toJSON = org.cometd.JSON.fromJSON = function(object)
{
    throw 'Abstract';
};

org.cometd.Utils = {};

org.cometd.Utils.isString = function(value)
{
    if (value === undefined || value === null)
    {
        return false;
    }
    return typeof value === 'string' ||  value instanceof String;
};

org.cometd.Utils.isArray = function(value)
{
    if (value === undefined || value === null)
    {
        return false;
    }
    return value instanceof Array;
};

/**
 * Returns whether the given element is contained into the given array.
 * @param element the element to check presence for
 * @param array the array to check for the element presence
 * @return the index of the element, if present, or a negative index if the element is not present
 */
org.cometd.Utils.inArray = function(element, array)
{
    for (var i = 0; i < array.length; ++i)
    {
        if (element == array[i])
        {
            return i;
        }
    }
    return -1;
};

org.cometd.Utils.setTimeout = function(cometd, funktion, delay)
{
    return setTimeout(function()
    {
        try
        {
            funktion();
        }
        catch (x)
        {
            cometd._debug('Exception invoking timed function', funktion, x);
        }
    }, delay);
};

/**
 * A registry for transports used by the Cometd object.
 */
org.cometd.TransportRegistry = function()
{
    var _types = [];
    var _transports = {};

    this.getTransportTypes = function()
    {
        return _types.slice(0);
    };

    this.findTransportTypes = function(version, crossDomain, url)
    {
        var result = [];
        for (var i = 0; i < _types.length; ++i)
        {
            var type = _types[i];
            if (_transports[type].accept(version, crossDomain, url) === true)
            {
                result.push(type);
            }
        }
        return result;
    };

    this.negotiateTransport = function(types, version, crossDomain, url)
    {
        for (var i = 0; i < _types.length; ++i)
        {
            var type = _types[i];
            for (var j = 0; j < types.length; ++j)
            {
                if (type == types[j])
                {
                    var transport = _transports[type];
                    if (transport.accept(version, crossDomain, url) === true)
                    {
                        return transport;
                    }
                }
            }
        }
        return null;
    };

    this.add = function(type, transport, index)
    {
        var existing = false;
        for (var i = 0; i < _types.length; ++i)
        {
            if (_types[i] == type)
            {
                existing = true;
                break;
            }
        }

        if (!existing)
        {
            if (typeof index !== 'number')
            {
                _types.push(type);
            }
            else
            {
                _types.splice(index, 0, type);
            }
            _transports[type] = transport;
        }

        return !existing;
    };

    this.find = function(name)
    {
        for (var i = 0; i < _types.length; ++i)
        {
            if (_types[i] == type)
            {
                return _transports[type];
            }
        }
        return null;
    };

    this.remove = function(type)
    {
        for (var i = 0; i < _types.length; ++i)
        {
            if (_types[i] == type)
            {
                _types.splice(i, 1);
                var transport = _transports[type];
                delete _transports[type];
                return transport;
            }
        }
        return null;
    };

    this.reset = function()
    {
        for (var i = 0; i < _types.length; ++i)
        {
            _transports[_types[i]].reset();
        }
    };
};

/**
 * Base object with the common functionality for transports.
 */
org.cometd.Transport = function()
{
    var _type;
    var _cometd;

    /**
     * Function invoked just after a transport has been successfully registered.
     * @param type the type of transport (for example 'long-polling')
     * @param cometd the cometd object this transport has been registered to
     * @see #unregistered()
     */
    this.registered = function(type, cometd)
    {
        _type = type;
        _cometd = cometd;
    };

    /**
     * Function invoked just after a transport has been successfully unregistered.
     * @see #registered(type, cometd)
     */
    this.unregistered = function()
    {
        _type = null;
        _cometd = null;
    };

    this._debug = function()
    {
        _cometd._debug.apply(_cometd, arguments);
    };

    this.getConfiguration = function()
    {
        return _cometd.getConfiguration();
    };

    this.getAdvice = function()
    {
        return _cometd.getAdvice();
    };

    this.setTimeout = function(funktion, delay)
    {
        return org.cometd.Utils.setTimeout(_cometd, funktion, delay);
    };

    /**
     * Converts the given response into an array of bayeux messages
     * @param response the response to convert
     * @return an array of bayeux messages obtained by converting the response
     */
    this.convertToMessages = function (response)
    {
        if (org.cometd.Utils.isString(response))
        {
            try
            {
                return org.cometd.JSON.fromJSON(response);
            }
            catch(x)
            {
                this._debug('Could not convert to JSON the following string', '"' + response + '"');
                throw x;
            }
        }
        if (org.cometd.Utils.isArray(response))
        {
            return response;
        }
        if (response === undefined || response === null)
        {
            return [];
        }
        if (response instanceof Object)
        {
            return [response];
        }
        throw 'Conversion Error ' + response + ', typeof ' + (typeof response);
    };

    /**
     * Returns whether this transport can work for the given version and cross domain communication case.
     * @param version a string indicating the transport version
     * @param crossDomain a boolean indicating whether the communication is cross domain
     * @return true if this transport can work for the given version and cross domain communication case,
     * false otherwise
     */
    this.accept = function(version, crossDomain, url)
    {
        throw 'Abstract';
    };

    /**
     * Returns the type of this transport.
     * @see #registered(type, cometd)
     */
    this.getType = function()
    {
        return _type;
    };

    this.send = function(envelope, metaConnect)
    {
        throw 'Abstract';
    };

    this.reset = function()
    {
        this._debug('Transport', _type, 'reset');
    };

    this.abort = function()
    {
        this._debug('Transport', _type, 'aborted');
    };

    this.toString = function()
    {
        return this.getType();
    };
};

org.cometd.Transport.derive = function(baseObject)
{
    function F() {}
    F.prototype = baseObject;
    return new F();
};

/**
 * Base object with the common functionality for transports based on requests.
 * The key responsibility is to allow at most 2 outstanding requests to the server,
 * to avoid that requests are sent behind a long poll.
 * To achieve this, we have one reserved request for the long poll, and all other
 * requests are serialized one after the other.
 */
org.cometd.RequestTransport = function()
{
    var _super = new org.cometd.Transport();
    var _self = org.cometd.Transport.derive(_super);
    var _requestIds = 0;
    var _metaConnectRequest = null;
    var _requests = [];
    var _envelopes = [];

    function _coalesceEnvelopes(envelope)
    {
        while (_envelopes.length > 0)
        {
            var envelopeAndRequest = _envelopes[0];
            var newEnvelope = envelopeAndRequest[0];
            var newRequest = envelopeAndRequest[1];
            if (newEnvelope.url === envelope.url &&
                    newEnvelope.sync === envelope.sync)
            {
                _envelopes.shift();
                envelope.messages = envelope.messages.concat(newEnvelope.messages);
                this._debug('Coalesced', newEnvelope.messages.length, 'messages from request', newRequest.id);
                continue;
            }
            break;
        }
    }

    function _transportSend(envelope, request)
    {
        this.transportSend(envelope, request);
        request.expired = false;

        if (!envelope.sync)
        {
            var maxDelay = this.getConfiguration().maxNetworkDelay;
            var delay = maxDelay;
            if (request.metaConnect === true)
            {
                delay += this.getAdvice().timeout;
            }

            this._debug('Transport', this, 'waiting at most', delay, 'ms for the response, maxNetworkDelay =', maxDelay);

            var self = this;
            request.timeout = this.setTimeout(function()
            {
                request.expired = true;
                if (request.xhr)
                {
                    request.xhr.abort();
                }
                var errorMessage = 'Request ' + request.id + ' of transport ' + self.getType() + ' exceeded ' + delay + ' ms max network delay';
                self._debug(errorMessage);
                self.complete(request, false, request.metaConnect);
                envelope.onFailure(request.xhr, 'timeout', errorMessage);
            }, delay);
        }
    }

    function _queueSend(envelope)
    {
        var requestId = ++_requestIds;
        var request = {
            id: requestId,
            metaConnect: false
        };

        // Consider the metaConnect requests which should always be present
        if (_requests.length < this.getConfiguration().maxConnections - 1)
        {
            this._debug('Transport', this, 'sending request', requestId, envelope);
            _transportSend.call(this, envelope, request);
            _requests.push(request);
        }
        else
        {
            this._debug('Transport queueing request', requestId, envelope);
            _envelopes.push([envelope, request]);
        }
    }

    function _metaConnectComplete(request)
    {
        var requestId = request.id;
        this._debug('Transport', this, 'metaConnect complete', requestId);
        if (_metaConnectRequest !== null && _metaConnectRequest.id !== requestId)
        {
            throw 'Longpoll request mismatch, completing request ' + requestId;
        }

        // Reset metaConnect request
        _metaConnectRequest = null;
    }

    function _complete(request, success)
    {
        var index = org.cometd.Utils.inArray(request, _requests);
        // The index can be negative the request has been aborted
        if (index >= 0)
        {
            _requests.splice(index, 1);
        }

        if (_envelopes.length > 0)
        {
            var envelopeAndRequest = _envelopes.shift();
            var nextEnvelope = envelopeAndRequest[0];
            var nextRequest = envelopeAndRequest[1];
            this._debug('Transport dequeued request', nextRequest.id);
            if (success)
            {
                if (this.getConfiguration().autoBatch)
                {
                    _coalesceEnvelopes.call(this, nextEnvelope);
                }
                _queueSend.call(this, nextEnvelope);
                this._debug('Transport completed request', request.id, nextEnvelope);
            }
            else
            {
                // Keep the semantic of calling response callbacks asynchronously after the request
                var self = this;
                this.setTimeout(function()
                {
                    self.complete(nextRequest, false, nextRequest.metaConnect);
                    nextEnvelope.onFailure(nextRequest.xhr, 'error', 'Previous request failed');
                }, 0);
            }
        }
    }

    _self.complete = function(request, success, metaConnect)
    {
        if (metaConnect)
        {
            _metaConnectComplete.call(this, request);
        }
        else
        {
            _complete.call(this, request, success);
        }
    };

    /**
     * Performs the actual send depending on the transport type details.
     * @param envelope the envelope to send
     * @param request the request information
     */
    _self.transportSend = function(envelope, request)
    {
        throw 'Abstract';
    };

    _self.transportSuccess = function(envelope, request, responses)
    {
        if (!request.expired)
        {
            clearTimeout(request.timeout);
            this.complete(request, true, request.metaConnect);
            if (responses && responses.length > 0)
            {
                envelope.onSuccess(responses);
            }
            else
            {
                envelope.onFailure(request, 'Empty HTTP response');
            }
        }
    };

    _self.transportFailure = function(envelope, request, reason, exception)
    {
        if (!request.expired)
        {
            clearTimeout(request.timeout);
            this.complete(request, false, request.metaConnect);
            envelope.onFailure(request.xhr, reason, exception);
        }
    };

    function _metaConnectSend(envelope)
    {
        if (_metaConnectRequest !== null)
        {
            throw 'Concurrent metaConnect requests not allowed, request id=' + _metaConnectRequest.id + ' not yet completed';
        }

        var requestId = ++_requestIds;
        this._debug('Transport', this, 'metaConnect send', requestId, envelope);
        var request = {
            id: requestId,
            metaConnect: true
        };
        _transportSend.call(this, envelope, request);
        _metaConnectRequest = request;
    }

    _self.send = function(envelope, metaConnect)
    {
        if (metaConnect)
        {
            _metaConnectSend.call(this, envelope);
        }
        else
        {
            _queueSend.call(this, envelope);
        }
    };

    _self.abort = function()
    {
        _super.abort();
        for (var i = 0; i < _requests.length; ++i)
        {
            var request = _requests[i];
            this._debug('Aborting request', request);
            if (request.xhr)
            {
                request.xhr.abort();
            }
        }
        if (_metaConnectRequest)
        {
            this._debug('Aborting metaConnect request', _metaConnectRequest);
            if (_metaConnectRequest.xhr)
            {
                _metaConnectRequest.xhr.abort();
            }
        }
        this.reset();
    };

    _self.reset = function()
    {
        _super.reset();
        _metaConnectRequest = null;
        _requests = [];
        _envelopes = [];
    };

    return _self;
};

org.cometd.LongPollingTransport = function()
{
    var _super = new org.cometd.RequestTransport();
    var _self = org.cometd.Transport.derive(_super);
    // By default, support cross domain
    var _supportsCrossDomain = true;

    _self.accept = function(version, crossDomain, url)
    {
        return _supportsCrossDomain || !crossDomain;
    };

    _self.xhrSend = function(packet)
    {
        throw 'Abstract';
    };

    _self.transportSend = function(envelope, request)
    {
        var self = this;
        try
        {
            var sameStack = true;
            request.xhr = this.xhrSend({
                transport: this,
                url: envelope.url,
                sync: envelope.sync,
                headers: this.getConfiguration().requestHeaders,
                body: org.cometd.JSON.toJSON(envelope.messages),
                onSuccess: function(response)
                {
                    self._debug('Transport', self, 'received response', response);
                    var success = false;
                    try
                    {
                        var received = self.convertToMessages(response);
                        if (received.length === 0)
                        {
                            _supportsCrossDomain = false;
                            self.transportFailure(envelope, request, 'no response', null);
                        }
                        else
                        {
                            success = true;
                            self.transportSuccess(envelope, request, received);
                        }
                    }
                    catch(x)
                    {
                        self._debug(x);
                        if (!success)
                        {
                            _supportsCrossDomain = false;
                            self.transportFailure(envelope, request, 'bad response', x);
                        }
                    }
                },
                onError: function(reason, exception)
                {
                    _supportsCrossDomain = false;
                    if (sameStack)
                    {
                        // Keep the semantic of calling response callbacks asynchronously after the request
                        self.setTimeout(function()
                        {
                            self.transportFailure(envelope, request, reason, exception);
                        }, 0);
                    }
                    else
                    {
                        self.transportFailure(envelope, request, reason, exception);
                    }
                }
            });
            sameStack = false;
        }
        catch (x)
        {
            _supportsCrossDomain = false;
            // Keep the semantic of calling response callbacks asynchronously after the request
            this.setTimeout(function()
            {
                self.transportFailure(envelope, request, 'error', x);
            }, 0);
        }
    };

    _self.reset = function()
    {
        _super.reset();
        _supportsCrossDomain = true;
    };

    return _self;
};

org.cometd.CallbackPollingTransport = function()
{
    var _super = new org.cometd.RequestTransport();
    var _self = org.cometd.Transport.derive(_super);
    var _maxLength = 2000;

    _self.accept = function(version, crossDomain, url)
    {
        return true;
    };

    _self.jsonpSend = function(packet)
    {
        throw 'Abstract';
    };

    _self.transportSend = function(envelope, request)
    {
        // Microsoft Internet Explorer has a 2083 URL max length
        // We must ensure that we stay within that length
        var messages = org.cometd.JSON.toJSON(envelope.messages);
        // Encode the messages because all brackets, quotes, commas, colons, etc
        // present in the JSON will be URL encoded, taking many more characters
        var urlLength = envelope.url.length + encodeURI(messages).length;

        var self = this;

        // Let's stay on the safe side and use 2000 instead of 2083
        // also because we did not count few characters among which
        // the parameter name 'message' and the parameter 'jsonp',
        // which sum up to about 50 chars
        if (urlLength > _maxLength)
        {
            var x = envelope.messages.length > 1 ?
                    'Too many bayeux messages in the same batch resulting in message too big ' +
                    '(' + urlLength + ' bytes, max is ' + _maxLength + ') for transport ' + this.getType() :
                    'Bayeux message too big (' + urlLength + ' bytes, max is ' + _maxLength + ') ' +
                    'for transport ' + this.getType();
            // Keep the semantic of calling response callbacks asynchronously after the request
            this.setTimeout(function()
            {
                self.transportFailure(envelope, request, 'error', x);
            }, 0);
        }
        else
        {
            try
            {
                var sameStack = true;
                this.jsonpSend({
                    transport: this,
                    url: envelope.url,
                    sync: envelope.sync,
                    headers: this.getConfiguration().requestHeaders,
                    body: messages,
                    onSuccess: function(responses)
                    {
                        var success = false;
                        try
                        {
                            var received = self.convertToMessages(responses);
                            if (received.length === 0)
                            {
                                self.transportFailure(envelope, request, 'no response', null);
                            }
                            else
                            {
                                success=true;
                                self.transportSuccess(envelope, request, received);
                            }
                        }
                        catch (x)
                        {
                            self._debug(x);
                            if (!success)
                            {
                                self.transportFailure(envelope, request, 'bad response', x);
                            }
                        }
                    },
                    onError: function(reason, exception)
                    {
                        if (sameStack)
                        {
                            // Keep the semantic of calling response callbacks asynchronously after the request
                            self.setTimeout(function()
                            {
                                self.transportFailure(envelope, request, reason, exception);
                            }, 0);
                        }
                        else
                        {
                            self.transportFailure(envelope, request, reason, exception);
                        }
                    }
                });
                sameStack = false;
            }
            catch (xx)
            {
                // Keep the semantic of calling response callbacks asynchronously after the request
                this.setTimeout(function()
                {
                    self.transportFailure(envelope, request, 'error', xx);
                }, 0);
            }
        }
    };

    return _self;
};

org.cometd.WebSocketTransport = function()
{
    var OPENED = 1;
    var CLOSED = 2;

    var _super = new org.cometd.Transport();
    var _self = org.cometd.Transport.derive(_super);
    var _cometd;
    // By default, support WebSocket
    var _supportsWebSocket = true;
    var _webSocketSupported = false;
    var _state = CLOSED;
    var _timeouts = {};
    var _envelopes = {};
    var _webSocket;
    var _successCallback;

    _self.registered = function(type, cometd)
    {
        _super.registered(type, cometd);
        _cometd = cometd;
    };

    _self.accept = function(version, crossDomain, url)
    {
        // Using !! to return a boolean (and not the WebSocket object)
        return _supportsWebSocket && !!window.WebSocket && _cometd.websocketEnabled === true;
    };

    function _websocketSend(envelope, metaConnect)
    {
        try
        {
            var json = org.cometd.JSON.toJSON(envelope.messages);
            _webSocket.send(json);
            this._debug('Transport', this, 'sent', envelope, 'metaConnect =', metaConnect);

            // Manage the timeout waiting for the response
            var maxDelay = this.getConfiguration().maxNetworkDelay;
            var delay = maxDelay;
            if (metaConnect)
            {
                delay += this.getAdvice().timeout;
            }

            var messageIds = [];
            for (var i = 0; i < envelope.messages.length; ++i)
            {
                var message = envelope.messages[i];
                if (message.id)
                {
                    messageIds.push(message.id);
                    var self = this;
                    _timeouts[message.id] = this.setTimeout(function()
                    {
                        var errorMessage = 'Message ' + message.id + ' of transport ' + self.getType() + ' exceeded ' + delay + ' ms max network delay';
                        self._debug(errorMessage);

                        delete _timeouts[message.id];

                        for (var ids in _envelopes)
                        {
                            if (_envelopes[ids] === envelope)
                            {
                                delete _envelopes[ids];
                                break;
                            }
                        }
                        envelope.onFailure(_webSocket, 'timeout', errorMessage);
                    }, delay);
                }
            }

            this._debug('Transport', this, 'waiting at most', delay, ' ms for messages', messageIds, 'maxNetworkDelay =', maxDelay, ', timeouts:', org.cometd.JSON.toJSON(_timeouts));
        }
        catch (x)
        {
            // Keep the semantic of calling response callbacks asynchronously after the request
            this.setTimeout(function()
            {
                envelope.onFailure(_webSocket, 'error', x);
            }, 0);
        }
    }

    _self.onMessage = function(wsMessage)
    {
        this._debug('Transport', this, 'received websocket message', wsMessage);

        if (_state === OPENED)
        {
            var messages = this.convertToMessages(wsMessage.data);
            var messageIds = [];
            for (var i = 0; i < messages.length; ++i)
            {
                var message = messages[i];

                // Detect if the message is a response to a request we made.
                // If it's a meta message, for sure it's a response;
                // otherwise it's a publish message and publish responses lack the data field
                if (/^\/meta\//.test(message.channel) || message.data === undefined)
                {
                    if (message.id)
                    {
                        messageIds.push(message.id);

                        var timeout = _timeouts[message.id];
                        if (timeout)
                        {
                            clearTimeout(timeout);
                            delete _timeouts[message.id];
                            this._debug('Transport', this, 'removed timeout for message', message.id, ', timeouts:', org.cometd.JSON.toJSON(_timeouts));
                        }
                    }
                }

                if ('/meta/disconnect' === message.channel && message.successful)
                {
                    _webSocket.close();
                }
            }

            // Remove the envelope corresponding to the messages
            var removed = false;
            for (var j = 0; j < messageIds.length; ++j)
            {
                var id = messageIds[j];
                for (var key in _envelopes)
                {
                    var ids = key.split(',');
                    var index = org.cometd.Utils.inArray(id, ids);
                    if (index >= 0)
                    {
                        removed = true;
                        ids.splice(index, 1);
                        var envelope = _envelopes[key];
                        delete _envelopes[key];
                        if (ids.length > 0)
                        {
                            _envelopes[ids.join(',')] = envelope;
                        }
                        break;
                    }
                }
            }
            if (removed)
            {
                this._debug('Transport', this, 'removed envelope, envelopes:', org.cometd.JSON.toJSON(_envelopes));
            }

            _successCallback.call(this, messages);
        }
    };

    _self.onClose = function()
    {
        this._debug('Transport', this, 'closed', _webSocket);

        // Remember if we were able to connect
        // This close event could be due to server shutdown, and if it restarts we want to try websocket again
        _supportsWebSocket = _webSocketSupported;

        for (var id in _timeouts)
        {
            clearTimeout(_timeouts[id]);
            delete _timeouts[id];
        }

        for (var ids in _envelopes)
        {
            _envelopes[ids].onFailure(_webSocket, 'closed');
            delete _envelopes[ids];
        }

        _state = CLOSED;
    };

    _self.send = function(envelope, metaConnect)
    {
        this._debug('Transport', this, 'sending', envelope, 'metaConnect =', metaConnect);

        // Store the envelope in any case; if the websocket cannot be opened, we fail it in close()
        var messageIds = [];
        for (var i = 0; i < envelope.messages.length; ++i)
        {
            var message = envelope.messages[i];
            if (message.id)
            {
                messageIds.push(message.id);
            }
        }
        _envelopes[messageIds.join(',')] = envelope;
        this._debug('Transport', this, 'stored envelope, envelopes:', org.cometd.JSON.toJSON(_envelopes));

        if (_state === OPENED)
        {
            _websocketSend.call(this, envelope, metaConnect);
        }
        else
        {
            // Mangle the URL, changing the scheme from 'http' to 'ws'
            var url = envelope.url.replace(/^http/, 'ws');
            this._debug('Transport', this, 'connecting to URL', url);

            _webSocket = new window.WebSocket(url);
            var self = this;
            _webSocket.onopen = function()
            {
                self._debug('WebSocket opened', _webSocket);
                _webSocketSupported = true;
                _state = OPENED;
                // Store the success callback, which is independent from the envelope,
                // so that it can be used to notify arrival of messages.
                _successCallback = envelope.onSuccess;
                _websocketSend.call(self, envelope, metaConnect);
            };
            _webSocket.onclose = function()
            {
                self.onClose();
            };
            _webSocket.onmessage = function(message)
            {
                self.onMessage(message);
            };
        }
    };

    _self.reset = function()
    {
        _super.reset();
        if (_webSocket)
        {
            _webSocket.close();
        }
        _supportsWebSocket = true;
        _webSocketSupported = false;
        _state = CLOSED;
        _timeouts = {};
        _envelopes = {};
        _webSocket = null;
        _successCallback = null;
    };

    return _self;
};

/**
 * The constructor for a Cometd object, identified by an optional name.
 * The default name is the string 'default'.
 * In the rare case a page needs more than one Bayeux conversation,
 * a new instance can be created via:
 * <pre>
 * var bayeuxUrl2 = ...;
 * var cometd2 = new $.Cometd();
 * cometd2.init({url: bayeuxUrl2});
 * </pre>
 * @param name the optional name of this cometd object
 */
// IMPLEMENTATION NOTES:
// Be very careful in not changing the function order and pass this file every time through JSLint (http://jslint.com)
// The only implied globals must be "dojo", "org" and "window", and check that there are no "unused" warnings
// Failing to pass JSLint may result in shrinkers/minifiers to create an unusable file.
org.cometd.Cometd = function(name)
{
    var _cometd = this;
    var _name = name || 'default';
    var _crossDomain = false;
    var _transports = new org.cometd.TransportRegistry();
    var _transport;
    var _status = 'disconnected';
    var _messageId = 0;
    var _clientId = null;
    var _batch = 0;
    var _messageQueue = [];
    var _internalBatch = false;
    var _listeners = {};
    var _backoff = 0;
    var _scheduledSend = null;
    var _extensions = [];
    var _advice = {};
    var _handshakeProps;
    var _reestablish = false;
    var _connected = false;
    var _config = {
        maxConnections: 2,
        backoffIncrement: 1000,
        maxBackoff: 60000,
        logLevel: 'info',
        reverseIncomingExtensions: true,
        maxNetworkDelay: 10000,
        requestHeaders: {},
        appendMessageTypeToURL: true,
        autoBatch: false,
        advice: {
            timeout: 60000,
            interval: 0,
            reconnect: 'retry'
        }
    };

    /**
     * Mixes in the given objects into the target object by copying the properties.
     * @param deep if the copy must be deep
     * @param target the target object
     * @param objects the objects whose properties are copied into the target
     */
    function _mixin(deep, target, objects)
    {
        var result = target || {};

        // Skip first 2 parameters (deep and target), and loop over the others
        for (var i = 2; i < arguments.length; ++i)
        {
            var object = arguments[i];

            if (object === undefined || object === null)
            {
                continue;
            }

            for (var propName in object)
            {
                var prop = object[propName];

                // Avoid infinite loops
                if (prop === target)
                {
                    continue;
                }
                // Do not mixin undefined values
                if (prop === undefined)
                {
                    continue;
                }

                if (deep && typeof prop === 'object' && prop !== null)
                {
                    if (prop instanceof Array)
                    {
                        result[propName] = _mixin(deep, [], prop);
                    }
                    else
                    {
                        result[propName] = _mixin(deep, {}, prop);
                    }
                }
                else
                {
                    result[propName] = prop;
                }
            }
        }

        return result;
    }

    /**
     * This method is exposed as facility for extensions that may need to clone messages.
     */
    this._mixin = _mixin;

    function _isString(value)
    {
        return org.cometd.Utils.isString(value);
    }

    function _isFunction(value)
    {
        if (value === undefined || value === null)
        {
            return false;
        }
        return typeof value === 'function';
    }

    function _log(level, args)
    {
        if (window.console)
        {
            var logger = window.console[level];
            if (_isFunction(logger))
            {
                logger.apply(window.console, args);
            }
        }
    }

    function _warn()
    {
        _log('warn', arguments);
    }
    this._warn = _warn;

    function _info()
    {
        if (_config.logLevel != 'warn')
        {
            _log('info', arguments);
        }
    }
    this._info = _info;

    function _debug()
    {
        if (_config.logLevel == 'debug')
        {
            _log('debug', arguments);
        }
    }
    this._debug = _debug;

    function _configure(configuration)
    {
        _debug('Configuring cometd object with', configuration);
        // Support old style param, where only the Bayeux server URL was passed
        if (_isString(configuration))
        {
            configuration = { url: configuration };
        }
        if (!configuration)
        {
            configuration = {};
        }

        _config = _mixin(false, _config, configuration);

        if (!_config.url)
        {
            throw 'Missing required configuration parameter \'url\' specifying the Bayeux server URL';
        }

        // Check if we're cross domain
        // [1] = protocol:, [2] = //host:port, [3] = host:port, [4] = host, [5] = :port, [6] = port, [7] = uri, [8] = rest
        var urlParts = /(^https?:)?(\/\/(([^:\/\?#]+)(:(\d+))?))?([^\?#]*)(.*)?/.exec(_config.url);
        _crossDomain = urlParts[3] && urlParts[3] != window.location.host;

        // Check if appending extra path is supported
        if (_config.appendMessageTypeToURL)
        {
            if (urlParts[8] !== undefined && urlParts[8].length > 0)
            {
                _info('Appending message type to URI ' + urlParts[7] + urlParts[8] + ' is not supported, disabling \'appendMessageTypeToURL\' configuration');
                _config.appendMessageTypeToURL = false;
            }
            else
            {
                var uriSegments = urlParts[7].split('/');
                var lastSegmentIndex = uriSegments.length - 1;
                if (urlParts[7].match(/\/$/))
                {
                    lastSegmentIndex -= 1;
                }
                if (uriSegments[lastSegmentIndex].indexOf('.') >= 0)
                {
                    // Very likely the CometD servlet's URL pattern is mapped to an extension, such as *.cometd
                    // It will be difficult to add the extra path in this case
                    _info('Appending message type to URI ' + urlParts[7] + ' is not supported, disabling \'appendMessageTypeToURL\' configuration');
                    _config.appendMessageTypeToURL = false;
                }
            }
        }
    }

    function _clearSubscriptions()
    {
        for (var channel in _listeners)
        {
            var subscriptions = _listeners[channel];
            for (var i = 0; i < subscriptions.length; ++i)
            {
                var subscription = subscriptions[i];
                if (subscription && !subscription.listener)
                {
                    delete subscriptions[i];
                    _debug('Removed subscription', subscription, 'for channel', channel);
                }
            }
        }
    }

    function _setStatus(newStatus)
    {
        if (_status != newStatus)
        {
            _debug('Status', _status, '->', newStatus);
            _status = newStatus;
        }
    }

    function _isDisconnected()
    {
        return _status == 'disconnecting' || _status == 'disconnected';
    }

    function _nextMessageId()
    {
        return ++_messageId;
    }

    function _applyExtension(scope, callback, name, message, outgoing)
    {
        try
        {
            return callback.call(scope, message);
        }
        catch (x)
        {
            _debug('Exception during execution of extension', name, x);
            var exceptionCallback = _cometd.onExtensionException;
            if (_isFunction(exceptionCallback))
            {
                _debug('Invoking extension exception callback', name, x);
                try
                {
                    exceptionCallback.call(_cometd, x, name, outgoing, message);
                }
                catch(xx)
                {
                    _info('Exception during execution of exception callback in extension', name, xx);
                }
            }
            return message;
        }
    }

    function _applyIncomingExtensions(message)
    {
        for (var i = 0; i < _extensions.length; ++i)
        {
            if (message === undefined || message === null)
            {
                break;
            }

            var index = _config.reverseIncomingExtensions ? _extensions.length - 1 - i : i;
            var extension = _extensions[index];
            var callback = extension.extension.incoming;
            if (_isFunction(callback))
            {
                var result = _applyExtension(extension.extension, callback, extension.name, message, false);
                message = result === undefined ? message : result;
            }
        }
        return message;
    }

    function _applyOutgoingExtensions(message)
    {
        for (var i = 0; i < _extensions.length; ++i)
        {
            if (message === undefined || message === null)
            {
                break;
            }

            var extension = _extensions[i];
            var callback = extension.extension.outgoing;
            if (_isFunction(callback))
            {
                var result = _applyExtension(extension.extension, callback, extension.name, message, true);
                message = result === undefined ? message : result;
            }
        }
        return message;
    }

    function _notify(channel, message)
    {
        var subscriptions = _listeners[channel];
        if (subscriptions && subscriptions.length > 0)
        {
            for (var i = 0; i < subscriptions.length; ++i)
            {
                var subscription = subscriptions[i];
                // Subscriptions may come and go, so the array may have 'holes'
                if (subscription)
                {
                    try
                    {
                        subscription.callback.call(subscription.scope, message);
                    }
                    catch (x)
                    {
                        _debug('Exception during notification', subscription, message, x);
                        var listenerCallback = _cometd.onListenerException;
                        if (_isFunction(listenerCallback))
                        {
                            _debug('Invoking listener exception callback', subscription, x);
                            try
                            {
                                listenerCallback.call(_cometd, x, subscription.handle, subscription.listener, message);
                            }
                            catch (xx)
                            {
                                _info('Exception during execution of listener callback', subscription, xx);
                            }
                        }
                    }
                }
            }
        }
    }

    function _notifyListeners(channel, message)
    {
        // Notify direct listeners
        _notify(channel, message);

        // Notify the globbing listeners
        var channelParts = channel.split('/');
        var last = channelParts.length - 1;
        for (var i = last; i > 0; --i)
        {
            var channelPart = channelParts.slice(0, i).join('/') + '/*';
            // We don't want to notify /foo/* if the channel is /foo/bar/baz,
            // so we stop at the first non recursive globbing
            if (i == last)
            {
                _notify(channelPart, message);
            }
            // Add the recursive globber and notify
            channelPart += '*';
            _notify(channelPart, message);
        }
    }

    function _cancelDelayedSend()
    {
        if (_scheduledSend !== null)
        {
            clearTimeout(_scheduledSend);
        }
        _scheduledSend = null;
    }

    function _delayedSend(operation)
    {
        _cancelDelayedSend();
        var delay = _advice.interval + _backoff;
        _debug('Function scheduled in', delay, 'ms, interval =', _advice.interval, 'backoff =', _backoff, operation);
        _scheduledSend = org.cometd.Utils.setTimeout(_cometd, operation, delay);
    }

    // Needed to break cyclic dependencies between function definitions
    var _handleMessages;
    var _handleFailure;

    /**
     * Delivers the messages to the CometD server
     * @param messages the array of messages to send
     * @param longpoll true if this send is a long poll
     */
    function _send(sync, messages, longpoll, extraPath)
    {
        // We must be sure that the messages have a clientId.
        // This is not guaranteed since the handshake may take time to return
        // (and hence the clientId is not known yet) and the application
        // may create other messages.
        for (var i = 0; i < messages.length; ++i)
        {
            var message = messages[i];
            message.id = '' + _nextMessageId();
            if (_clientId)
            {
                message.clientId = _clientId;
            }
            message = _applyOutgoingExtensions(message);
            if (message !== undefined && message !== null)
            {
                messages[i] = message;
            }
            else
            {
                messages.splice(i--, 1);
            }
        }
        if (messages.length === 0)
        {
            return;
        }

        var url = _config.url;
        if (_config.appendMessageTypeToURL)
        {
            // If url does not end with '/', then append it
            if (!url.match(/\/$/))
            {
                url = url + '/';
            }
            if (extraPath)
            {
                url = url + extraPath;
            }
        }

        var envelope = {
            url: url,
            sync: sync,
            messages: messages,
            onSuccess: function(rcvdMessages)
            {
                try
                {
                    _handleMessages.call(_cometd, rcvdMessages);
                }
                catch (x)
                {
                    _debug('Exception during handling of messages', x);
                }
            },
            onFailure: function(conduit, reason, exception)
            {
                try
                {
                    _handleFailure.call(_cometd, conduit, messages, reason, exception);
                }
                catch (x)
                {
                    _debug('Exception during handling of failure', x);
                }
            }
        };
        _debug('Send, sync =', sync, envelope);
        _transport.send(envelope, longpoll);
    }

    function _queueSend(message)
    {
        if (_batch > 0 || _internalBatch === true)
        {
            _messageQueue.push(message);
        }
        else
        {
            _send(false, [message], false);
        }
    }

    /**
     * Sends a complete bayeux message.
     * This method is exposed as a public so that extensions may use it
     * to send bayeux message directly, for example in case of re-sending
     * messages that have already been sent but that for some reason must
     * be resent.
     */
    this.send = _queueSend;

    function _resetBackoff()
    {
        _backoff = 0;
    }

    function _increaseBackoff()
    {
        if (_backoff < _config.maxBackoff)
        {
            _backoff += _config.backoffIncrement;
        }
    }

    /**
     * Starts a the batch of messages to be sent in a single request.
     * @see #_endBatch(sendMessages)
     */
    function _startBatch()
    {
        ++_batch;
    }

    function _flushBatch()
    {
        var messages = _messageQueue;
        _messageQueue = [];
        if (messages.length > 0)
        {
            _send(false, messages, false);
        }
    }

    /**
     * Ends the batch of messages to be sent in a single request,
     * optionally sending messages present in the message queue depending
     * on the given argument.
     * @see #_startBatch()
     */
    function _endBatch()
    {
        --_batch;
        if (_batch < 0)
        {
            throw 'Calls to startBatch() and endBatch() are not paired';
        }

        if (_batch === 0 && !_isDisconnected() && !_internalBatch)
        {
            _flushBatch();
        }
    }

    /**
     * Sends the connect message
     */
    function _connect()
    {
        if (!_isDisconnected())
        {
            var message = {
                channel: '/meta/connect',
                connectionType: _transport.getType()
            };

            // In case of reload or temporary loss of connection
            // we want the next successful connect to return immediately
            // instead of being held by the server, so that connect listeners
            // can be notified that the connection has been re-established
            if (!_connected)
            {
                message.advice = { timeout: 0 };
            }

            _setStatus('connecting');
            _debug('Connect sent', message, org.cometd.JSON.toJSON(message));
            _send(false, [message], true, 'connect');
            _setStatus('connected');
        }
    }

    function _delayedConnect()
    {
        _setStatus('connecting');
        _delayedSend(function()
        {
            _connect();
        });
    }

    function _updateAdvice(newAdvice)
    {
        if (newAdvice)
        {
            _advice = _mixin(false, {}, _config.advice, newAdvice);
            _debug('New advice', _advice, org.cometd.JSON.toJSON(_advice));
        }
    }

    /**
     * Sends the initial handshake message
     */
    function _handshake(handshakeProps)
    {
        _clientId = null;

        _clearSubscriptions();

        // Reset the transports if we're not retrying the handshake
        if (_isDisconnected())
        {
            _transports.reset();
        }

        if (_isDisconnected())
        {
            _updateAdvice(_config.advice);
        }
        else
        {
            // We are retrying the handshake, either because another handshake failed
            // and we're backing off, or because the server timed us out and asks us to
            // re-handshake: in both cases, make sure that if the handshake succeeds
            // the next action is a connect.
            _updateAdvice(_mixin(false, _advice, {reconnect: 'retry'}));
        }

        _batch = 0;

        // Mark the start of an internal batch.
        // This is needed because handshake and connect are async.
        // It may happen that the application calls init() then subscribe()
        // and the subscribe message is sent before the connect message, if
        // the subscribe message is not held until the connect message is sent.
        // So here we start a batch to hold temporarily any message until
        // the connection is fully established.
        _internalBatch = true;

        // Save the properties provided by the user, so that
        // we can reuse them during automatic re-handshake
        _handshakeProps = handshakeProps;

        var version = '1.0';

        // Figure out the transports to send to the server
        var transportTypes = _transports.findTransportTypes(version, _crossDomain, _config.url);

        var bayeuxMessage = {
            version: version,
            minimumVersion: '0.9',
            channel: '/meta/handshake',
            supportedConnectionTypes: transportTypes,
            advice: {
                timeout: _advice.timeout,
                interval: _advice.interval
            }
        };
        // Do not allow the user to mess with the required properties,
        // so merge first the user properties and *then* the bayeux message
        var message = _mixin(false, {}, _handshakeProps, bayeuxMessage);

        // Pick up the first available transport as initial transport
        // since we don't know if the server supports it
        _transport = _transports.negotiateTransport(transportTypes, version, _crossDomain, _config.url);
        _debug('Initial transport is', _transport.getType(), _transport);

        // We started a batch to hold the application messages,
        // so here we must bypass it and send immediately.
        _setStatus('handshaking');
        _debug('Handshake sent', message);
        _send(false, [message], false, 'handshake');
    }

    function _delayedHandshake()
    {
        _setStatus('handshaking');

        // We will call _handshake() which will reset _clientId, but we want to avoid
        // that between the end of this method and the call to _handshake() someone may
        // call publish() (or other methods that call _queueSend()).
        _internalBatch = true;

        _delayedSend(function()
        {
            _handshake(_handshakeProps);
        });
    }

    function _failHandshake(message)
    {
        _notifyListeners('/meta/handshake', message);
        _notifyListeners('/meta/unsuccessful', message);

        // Only try again if we haven't been disconnected and
        // the advice permits us to retry the handshake
        var retry = !_isDisconnected() && _advice.reconnect != 'none';
        if (retry)
        {
            _increaseBackoff();
            _delayedHandshake();
        }
        else
        {
            _resetBackoff();
            _setStatus('disconnected');
        }
    }

    function _handshakeResponse(message)
    {
        if (message.successful)
        {
            // Save clientId, figure out transport, then follow the advice to connect
            _clientId = message.clientId;

            var newTransport = _transports.negotiateTransport(message.supportedConnectionTypes, message.version, _crossDomain, _config.url);
            if (newTransport === null)
            {
                throw 'Could not negotiate transport with server; client ' +
                      _transports.findTransportTypes(message.version, _crossDomain, _config.url) +
                      ', server ' + message.supportedConnectionTypes;
            }
            else if (_transport != newTransport)
            {
                _debug('Transport', _transport, '->', newTransport);
                _transport = newTransport;
            }

            // End the internal batch and allow held messages from the application
            // to go to the server (see _handshake() where we start the internal batch).
            _internalBatch = false;
            _flushBatch();

            // Here the new transport is in place, as well as the clientId, so
            // the listeners can perform a publish() if they want.
            // Notify the listeners before the connect below.
            message.reestablish = _reestablish;
            _reestablish = true;
            _notifyListeners('/meta/handshake', message);

            var action = _isDisconnected() ? 'none' : _advice.reconnect;
            switch (action)
            {
                case 'retry':
                    _resetBackoff();
                    _delayedConnect();
                    break;
                case 'none':
                    _resetBackoff();
                    _setStatus('disconnected');
                    break;
                default:
                    throw 'Unrecognized advice action ' + action;
            }
        }
        else
        {
            _failHandshake(message);
        }
    }

    function _handshakeFailure(xhr, message)
    {
        _failHandshake({
            successful: false,
            failure: true,
            channel: '/meta/handshake',
            request: message,
            xhr: xhr,
            advice: {
                reconnect: 'retry',
                interval: _backoff
            }
        });
    }

    function _failConnect(message)
    {
        // Notify the listeners after the status change but before the next action
        _notifyListeners('/meta/connect', message);
        _notifyListeners('/meta/unsuccessful', message);

        // This may happen when the server crashed, the current clientId
        // will be invalid, and the server will ask to handshake again
        // Listeners can call disconnect(), so check the state after they run
        var action = _isDisconnected() ? 'none' : _advice.reconnect;
        switch (action)
        {
            case 'retry':
                _increaseBackoff();
                _delayedConnect();
                break;
            case 'handshake':
                _resetBackoff();
                _delayedHandshake();
                break;
            case 'none':
                _resetBackoff();
                _setStatus('disconnected');
                break;
            default:
                throw 'Unrecognized advice action' + action;
        }
    }

    function _connectResponse(message)
    {
        _connected = message.successful;

        if (_connected)
        {
            _notifyListeners('/meta/connect', message);

            // Normally, the advice will say "reconnect: 'retry', interval: 0"
            // and the server will hold the request, so when a response returns
            // we immediately call the server again (long polling)
            // Listeners can call disconnect(), so check the state after they run
            var action1 = _isDisconnected() ? 'none' : _advice.reconnect;
            switch (action1)
            {
                case 'retry':
                    _resetBackoff();
                    _delayedConnect();
                    break;
                case 'none':
                    _resetBackoff();
                    _setStatus('disconnected');
                    break;
                default:
                    throw 'Unrecognized advice action ' + action1;
            }
        }
        else
        {
            _failConnect(message);
        }
    }

    function _connectFailure(xhr, message)
    {
        _connected = false;
        _failConnect({
            successful: false,
            failure: true,
            channel: '/meta/connect',
            request: message,
            xhr: xhr,
            advice: {
                reconnect: 'retry',
                interval: _backoff
            }
        });
    }

    function _disconnect(abort)
    {
        _cancelDelayedSend();
        if (abort)
        {
            _transport.abort();
        }
        _clientId = null;
        _setStatus('disconnected');
        _batch = 0;
        _messageQueue = [];
        _resetBackoff();
    }

    function _failDisconnect(message)
    {
        _disconnect(true);
        _notifyListeners('/meta/disconnect', message);
        _notifyListeners('/meta/unsuccessful', message);
    }

    function _disconnectResponse(message)
    {
        if (message.successful)
        {
            _disconnect(false);
            _notifyListeners('/meta/disconnect', message);
        }
        else
        {
            _failDisconnect(message);
        }
    }

    function _disconnectFailure(xhr, message)
    {
        _failDisconnect({
            successful: false,
            failure: true,
            channel: '/meta/disconnect',
            request: message,
            xhr: xhr,
            advice: {
                reconnect: 'none',
                interval: 0
            }
        });
    }

    function _failSubscribe(message)
    {
        _notifyListeners('/meta/subscribe', message);
        _notifyListeners('/meta/unsuccessful', message);
    }

    function _subscribeResponse(message)
    {
        if (message.successful)
        {
            _notifyListeners('/meta/subscribe', message);
        }
        else
        {
            _failSubscribe(message);
        }
    }

    function _subscribeFailure(xhr, message)
    {
        _failSubscribe({
            successful: false,
            failure: true,
            channel: '/meta/subscribe',
            request: message,
            xhr: xhr,
            advice: {
                reconnect: 'none',
                interval: 0
            }
        });
    }

    function _failUnsubscribe(message)
    {
        _notifyListeners('/meta/unsubscribe', message);
        _notifyListeners('/meta/unsuccessful', message);
    }

    function _unsubscribeResponse(message)
    {
        if (message.successful)
        {
            _notifyListeners('/meta/unsubscribe', message);
        }
        else
        {
            _failUnsubscribe(message);
        }
    }

    function _unsubscribeFailure(xhr, message)
    {
        _failUnsubscribe({
            successful: false,
            failure: true,
            channel: '/meta/unsubscribe',
            request: message,
            xhr: xhr,
            advice: {
                reconnect: 'none',
                interval: 0
            }
        });
    }

    function _failMessage(message)
    {
        _notifyListeners('/meta/publish', message);
        _notifyListeners('/meta/unsuccessful', message);
    }

    function _messageResponse(message)
    {
        if (message.successful === undefined)
        {
            if (message.data)
            {
                // It is a plain message, and not a bayeux meta message
                _notifyListeners(message.channel, message);
            }
            else
            {
                _debug('Unknown message', message);
            }
        }
        else
        {
            if (message.successful)
            {
                _notifyListeners('/meta/publish', message);
            }
            else
            {
                _failMessage(message);
            }
        }
    }

    function _messageFailure(xhr, message)
    {
        _failMessage({
            successful: false,
            failure: true,
            channel: message.channel,
            request: message,
            xhr: xhr,
            advice: {
                reconnect: 'none',
                interval: 0
            }
        });
    }

    function _receive(message)
    {
        message = _applyIncomingExtensions(message);
        if (message === undefined || message === null)
        {
            return;
        }

        _updateAdvice(message.advice);

        var channel = message.channel;
        switch (channel)
        {
            case '/meta/handshake':
                _handshakeResponse(message);
                break;
            case '/meta/connect':
                _connectResponse(message);
                break;
            case '/meta/disconnect':
                _disconnectResponse(message);
                break;
            case '/meta/subscribe':
                _subscribeResponse(message);
                break;
            case '/meta/unsubscribe':
                _unsubscribeResponse(message);
                break;
            default:
                _messageResponse(message);
                break;
        }
    }

    /**
     * Receives a message.
     * This method is exposed as a public so that extensions may inject
     * messages simulating that they had been received.
     */
    this.receive = _receive;

    _handleMessages = function _handleMessages(rcvdMessages)
    {
        _debug('Received', rcvdMessages, org.cometd.JSON.toJSON(rcvdMessages));

        for (var i = 0; i < rcvdMessages.length; ++i)
        {
            var message = rcvdMessages[i];
            _receive(message);
        }
    };

    _handleFailure = function _handleFailure(conduit, messages, reason, exception)
    {
        _debug('handleFailure', conduit, messages, reason, exception);

        for (var i = 0; i < messages.length; ++i)
        {
            var message = messages[i];
            var channel = message.channel;
            switch (channel)
            {
                case '/meta/handshake':
                    _handshakeFailure(conduit, message);
                    break;
                case '/meta/connect':
                    _connectFailure(conduit, message);
                    break;
                case '/meta/disconnect':
                    _disconnectFailure(conduit, message);
                    break;
                case '/meta/subscribe':
                    _subscribeFailure(conduit, message);
                    break;
                case '/meta/unsubscribe':
                    _unsubscribeFailure(conduit, message);
                    break;
                default:
                    _messageFailure(conduit, message);
                    break;
            }
        }
    };

    function _hasSubscriptions(channel)
    {
        var subscriptions = _listeners[channel];
        if (subscriptions)
        {
            for (var i = 0; i < subscriptions.length; ++i)
            {
                if (subscriptions[i])
                {
                    return true;
                }
            }
        }
        return false;
    }

    function _resolveScopedCallback(scope, callback)
    {
        var delegate = {
            scope: scope,
            method: callback
        };
        if (_isFunction(scope))
        {
            delegate.scope = undefined;
            delegate.method = scope;
        }
        else
        {
            if (_isString(callback))
            {
                if (!scope)
                {
                    throw 'Invalid scope ' + scope;
                }
                delegate.method = scope[callback];
                if (!_isFunction(delegate.method))
                {
                    throw 'Invalid callback ' + callback + ' for scope ' + scope;
                }
            }
            else if (!_isFunction(callback))
            {
                throw 'Invalid callback ' + callback;
            }
        }
        return delegate;
    }

    function _addListener(channel, scope, callback, isListener)
    {
        // The data structure is a map<channel, subscription[]>, where each subscription
        // holds the callback to be called and its scope.

        var delegate = _resolveScopedCallback(scope, callback);
        _debug('Adding listener on', channel, 'with scope', delegate.scope, 'and callback', delegate.method);

        var subscription = {
            channel: channel,
            scope: delegate.scope,
            callback: delegate.method,
            listener: isListener
        };

        var subscriptions = _listeners[channel];
        if (!subscriptions)
        {
            subscriptions = [];
            _listeners[channel] = subscriptions;
        }

        // Pushing onto an array appends at the end and returns the id associated with the element increased by 1.
        // Note that if:
        // a.push('a'); var hb=a.push('b'); delete a[hb-1]; var hc=a.push('c');
        // then:
        // hc==3, a.join()=='a',,'c', a.length==3
        var subscriptionID = subscriptions.push(subscription) - 1;
        subscription.id = subscriptionID;
        subscription.handle = [channel, subscriptionID];

        _debug('Added listener', subscription, 'for channel', channel, 'having id =', subscriptionID);

        // The subscription to allow removal of the listener is made of the channel and the index
        return subscription.handle;
    }

    function _removeListener(subscription)
    {
        var subscriptions = _listeners[subscription[0]];
        if (subscriptions)
        {
            delete subscriptions[subscription[1]];
            _debug('Removed listener', subscription);
        }
    }

    //
    // PUBLIC API
    //

    /**
     * Registers the given transport under the given transport type.
     * The optional index parameter specifies the "priority" at which the
     * transport is registered (where 0 is the max priority).
     * If a transport with the same type is already registered, this function
     * does nothing and returns false.
     * @param type the transport type
     * @param transport the transport object
     * @param index the index at which this transport is to be registered
     * @return true if the transport has been registered, false otherwise
     * @see #unregisterTransport(type)
     */
    this.registerTransport = function(type, transport, index)
    {
        var result = _transports.add(type, transport, index);
        if (result)
        {
            _debug('Registered transport', type);

            if (_isFunction(transport.registered))
            {
                transport.registered(type, this);
            }
        }
        return result;
    };

    /**
     * @return an array of all registered transport types
     */
    this.getTransportTypes = function()
    {
        return _transports.getTransportTypes();
    };

    /**
     * Unregisters the transport with the given transport type.
     * @param type the transport type to unregister
     * @return the transport that has been unregistered,
     * or null if no transport was previously registered under the given transport type
     */
    this.unregisterTransport = function(type)
    {
        var transport = _transports.remove(type);
        if (transport !== null)
        {
            _debug('Unregistered transport', type);

            if (_isFunction(transport.unregistered))
            {
                transport.unregistered();
            }
        }
        return transport;
    };

    this.findTransport = function(name)
    {
        return _transports.find(name);
    };

    /**
     * Configures the initial Bayeux communication with the Bayeux server.
     * Configuration is passed via an object that must contain a mandatory field <code>url</code>
     * of type string containing the URL of the Bayeux server.
     * @param configuration the configuration object
     */
    this.configure = function(configuration)
    {
        _configure.call(this, configuration);
    };

    /**
     * Configures and establishes the Bayeux communication with the Bayeux server
     * via a handshake and a subsequent connect.
     * @param configuration the configuration object
     * @param handshakeProps an object to be merged with the handshake message
     * @see #configure(configuration)
     * @see #handshake(handshakeProps)
     */
    this.init = function(configuration, handshakeProps)
    {
        this.configure(configuration);
        this.handshake(handshakeProps);
    };

    /**
     * Establishes the Bayeux communication with the Bayeux server
     * via a handshake and a subsequent connect.
     * @param handshakeProps an object to be merged with the handshake message
     */
    this.handshake = function(handshakeProps)
    {
        _setStatus('disconnected');
        _reestablish = false;
        _handshake(handshakeProps);
    };

    /**
     * Disconnects from the Bayeux server.
     * It is possible to suggest to attempt a synchronous disconnect, but this feature
     * may only be available in certain transports (for example, long-polling may support
     * it, callback-polling certainly does not).
     * @param sync whether attempt to perform a synchronous disconnect
     * @param disconnectProps an object to be merged with the disconnect message
     */
    this.disconnect = function(sync, disconnectProps)
    {
        if (_isDisconnected())
        {
            return;
        }

        if (disconnectProps === undefined)
        {
            if (typeof sync !== 'boolean')
            {
                disconnectProps = sync;
                sync = false;
            }
        }

        var bayeuxMessage = {
            channel: '/meta/disconnect'
        };
        var message = _mixin(false, {}, disconnectProps, bayeuxMessage);
        _setStatus('disconnecting');
        _send(sync === true, [message], false, 'disconnect');
    };

    /**
     * Marks the start of a batch of application messages to be sent to the server
     * in a single request, obtaining a single response containing (possibly) many
     * application reply messages.
     * Messages are held in a queue and not sent until {@link #endBatch()} is called.
     * If startBatch() is called multiple times, then an equal number of endBatch()
     * calls must be made to close and send the batch of messages.
     * @see #endBatch()
     */
    this.startBatch = function()
    {
        _startBatch();
    };

    /**
     * Marks the end of a batch of application messages to be sent to the server
     * in a single request.
     * @see #startBatch()
     */
    this.endBatch = function()
    {
        _endBatch();
    };

    /**
     * Executes the given callback in the given scope, surrounded by a {@link #startBatch()}
     * and {@link #endBatch()} calls.
     * @param scope the scope of the callback, may be omitted
     * @param callback the callback to be executed within {@link #startBatch()} and {@link #endBatch()} calls
     */
    this.batch = function(scope, callback)
    {
        var delegate = _resolveScopedCallback(scope, callback);
        this.startBatch();
        try
        {
            delegate.method.call(delegate.scope);
            this.endBatch();
        }
        catch (x)
        {
            _debug('Exception during execution of batch', x);
            this.endBatch();
            throw x;
        }
    };

    /**
     * Adds a listener for bayeux messages, performing the given callback in the given scope
     * when a message for the given channel arrives.
     * @param channel the channel the listener is interested to
     * @param scope the scope of the callback, may be omitted
     * @param callback the callback to call when a message is sent to the channel
     * @returns the subscription handle to be passed to {@link #removeListener(object)}
     * @see #removeListener(subscription)
     */
    this.addListener = function(channel, scope, callback)
    {
        if (arguments.length < 2)
        {
            throw 'Illegal arguments number: required 2, got ' + arguments.length;
        }
        if (!_isString(channel))
        {
            throw 'Illegal argument type: channel must be a string';
        }

        return _addListener(channel, scope, callback, true);
    };

    /**
     * Removes the subscription obtained with a call to {@link #addListener(string, object, function)}.
     * @param subscription the subscription to unsubscribe.
     * @see #addListener(channel, scope, callback)
     */
    this.removeListener = function(subscription)
    {
        if (!org.cometd.Utils.isArray(subscription))
        {
            throw 'Invalid argument: expected subscription, not ' + subscription;
        }

        _removeListener(subscription);
    };

    /**
     * Removes all listeners registered with {@link #addListener(channel, scope, callback)} or
     * {@link #subscribe(channel, scope, callback)}.
     */
    this.clearListeners = function()
    {
        _listeners = {};
    };

    /**
     * Subscribes to the given channel, performing the given callback in the given scope
     * when a message for the channel arrives.
     * @param channel the channel to subscribe to
     * @param scope the scope of the callback, may be omitted
     * @param callback the callback to call when a message is sent to the channel
     * @param subscribeProps an object to be merged with the subscribe message
     * @return the subscription handle to be passed to {@link #unsubscribe(object)}
     */
    this.subscribe = function(channel, scope, callback, subscribeProps)
    {
        if (arguments.length < 2)
        {
            throw 'Illegal arguments number: required 2, got ' + arguments.length;
        }
        if (!_isString(channel))
        {
            throw 'Illegal argument type: channel must be a string';
        }
        if (_isDisconnected())
        {
            throw 'Illegal state: already disconnected';
        }

        // Normalize arguments
        if (_isFunction(scope))
        {
            subscribeProps = callback;
            callback = scope;
            scope = undefined;
        }

        // Only send the message to the server if this clientId has not yet subscribed to the channel
        var send = !_hasSubscriptions(channel);

        var subscription = _addListener(channel, scope, callback, false);

        if (send)
        {
            // Send the subscription message after the subscription registration to avoid
            // races where the server would send a message to the subscribers, but here
            // on the client the subscription has not been added yet to the data structures
            var bayeuxMessage = {
                channel: '/meta/subscribe',
                subscription: channel
            };
            var message = _mixin(false, {}, subscribeProps, bayeuxMessage);
            _queueSend(message);
        }

        return subscription;
    };

    /**
     * Unsubscribes the subscription obtained with a call to {@link #subscribe(string, object, function)}.
     * @param subscription the subscription to unsubscribe.
     */
    this.unsubscribe = function(subscription, unsubscribeProps)
    {
        if (arguments.length < 1)
        {
            throw 'Illegal arguments number: required 1, got ' + arguments.length;
        }
        if (_isDisconnected())
        {
            throw 'Illegal state: already disconnected';
        }

        // Remove the local listener before sending the message
        // This ensures that if the server fails, this client does not get notifications
        this.removeListener(subscription);

        var channel = subscription[0];
        // Only send the message to the server if this clientId unsubscribes the last subscription
        if (!_hasSubscriptions(channel))
        {
            var bayeuxMessage = {
                channel: '/meta/unsubscribe',
                subscription: channel
            };
            var message = _mixin(false, {}, unsubscribeProps, bayeuxMessage);
            _queueSend(message);
        }
    };

    /**
     * Removes all subscriptions added via {@link #subscribe(channel, scope, callback, subscribeProps)},
     * but does not remove the listeners added via {@link addListener(channel, scope, callback)}.
     */
    this.clearSubscriptions = function()
    {
        _clearSubscriptions();
    };

    /**
     * Publishes a message on the given channel, containing the given content.
     * @param channel the channel to publish the message to
     * @param content the content of the message
     * @param publishProps an object to be merged with the publish message
     */
    this.publish = function(channel, content, publishProps)
    {
        if (arguments.length < 1)
        {
            throw 'Illegal arguments number: required 1, got ' + arguments.length;
        }
        if (!_isString(channel))
        {
            throw 'Illegal argument type: channel must be a string';
        }
        if (_isDisconnected())
        {
            throw 'Illegal state: already disconnected';
        }

        var bayeuxMessage = {
            channel: channel,
            data: content
        };
        var message = _mixin(false, {}, publishProps, bayeuxMessage);
        _queueSend(message);
    };

    /**
     * Returns a string representing the status of the bayeux communication with the Bayeux server.
     */
    this.getStatus = function()
    {
        return _status;
    };

    /**
     * Returns whether this instance has been disconnected.
     */
    this.isDisconnected = _isDisconnected;

    /**
     * Sets the backoff period used to increase the backoff time when retrying an unsuccessful or failed message.
     * Default value is 1 second, which means if there is a persistent failure the retries will happen
     * after 1 second, then after 2 seconds, then after 3 seconds, etc. So for example with 15 seconds of
     * elapsed time, there will be 5 retries (at 1, 3, 6, 10 and 15 seconds elapsed).
     * @param period the backoff period to set
     * @see #getBackoffIncrement()
     */
    this.setBackoffIncrement = function(period)
    {
        _config.backoffIncrement = period;
    };

    /**
     * Returns the backoff period used to increase the backoff time when retrying an unsuccessful or failed message.
     * @see #setBackoffIncrement(period)
     */
    this.getBackoffIncrement = function()
    {
        return _config.backoffIncrement;
    };

    /**
     * Returns the backoff period to wait before retrying an unsuccessful or failed message.
     */
    this.getBackoffPeriod = function()
    {
        return _backoff;
    };

    /**
     * Sets the log level for console logging.
     * Valid values are the strings 'error', 'warn', 'info' and 'debug', from
     * less verbose to more verbose.
     * @param level the log level string
     */
    this.setLogLevel = function(level)
    {
        _config.logLevel = level;
    };

    /**
     * Registers an extension whose callbacks are called for every incoming message
     * (that comes from the server to this client implementation) and for every
     * outgoing message (that originates from this client implementation for the
     * server).
     * The format of the extension object is the following:
     * <pre>
     * {
     *     incoming: function(message) { ... },
     *     outgoing: function(message) { ... }
     * }
     * </pre>
     * Both properties are optional, but if they are present they will be called
     * respectively for each incoming message and for each outgoing message.
     * @param name the name of the extension
     * @param extension the extension to register
     * @return true if the extension was registered, false otherwise
     * @see #unregisterExtension(name)
     */
    this.registerExtension = function(name, extension)
    {
        if (arguments.length < 2)
        {
            throw 'Illegal arguments number: required 2, got ' + arguments.length;
        }
        if (!_isString(name))
        {
            throw 'Illegal argument type: extension name must be a string';
        }

        var existing = false;
        for (var i = 0; i < _extensions.length; ++i)
        {
            var existingExtension = _extensions[i];
            if (existingExtension.name == name)
            {
                existing = true;
                break;
            }
        }
        if (!existing)
        {
            _extensions.push({
                name: name,
                extension: extension
            });
            _debug('Registered extension', name);

            // Callback for extensions
            if (_isFunction(extension.registered))
            {
                extension.registered(name, this);
            }

            return true;
        }
        else
        {
            _info('Could not register extension with name', name, 'since another extension with the same name already exists');
            return false;
        }
    };

    /**
     * Unregister an extension previously registered with
     * {@link #registerExtension(name, extension)}.
     * @param name the name of the extension to unregister.
     * @return true if the extension was unregistered, false otherwise
     */
    this.unregisterExtension = function(name)
    {
        if (!_isString(name))
        {
            throw 'Illegal argument type: extension name must be a string';
        }

        var unregistered = false;
        for (var i = 0; i < _extensions.length; ++i)
        {
            var extension = _extensions[i];
            if (extension.name == name)
            {
                _extensions.splice(i, 1);
                unregistered = true;
                _debug('Unregistered extension', name);

                // Callback for extensions
                var ext = extension.extension;
                if (_isFunction(ext.unregistered))
                {
                    ext.unregistered();
                }

                break;
            }
        }
        return unregistered;
    };

    /**
     * Find the extension registered with the given name.
     * @param name the name of the extension to find
     * @return the extension found or null if no extension with the given name has been registered
     */
    this.getExtension = function(name)
    {
        for (var i = 0; i < _extensions.length; ++i)
        {
            var extension = _extensions[i];
            if (extension.name == name)
            {
                return extension.extension;
            }
        }
        return null;
    };

    /**
     * Returns the name assigned to this Cometd object, or the string 'default'
     * if no name has been explicitly passed as parameter to the constructor.
     */
    this.getName = function()
    {
        return _name;
    };

    /**
     * Returns the clientId assigned by the Bayeux server during handshake.
     */
    this.getClientId = function()
    {
        return _clientId;
    };

    /**
     * Returns the URL of the Bayeux server.
     */
    this.getURL = function()
    {
        return _config.url;
    };

    this.getTransport = function()
    {
        return _transport;
    };

    this.getConfiguration = function()
    {
        return _mixin(true, {}, _config);
    };

    this.getAdvice = function()
    {
        return _mixin(true, {}, _advice);
    };
};

/**
 * Dual licensed under the Apache License 2.0 and the MIT license.
 * $Revision$ $Date: 2009-05-10 13:06:45 +1000 (Sun, 10 May 2009) $
 */

if (typeof dojo!="undefined")
{
    dojo.provide("org.cometd.AckExtension");
}

/**
 * This client-side extension enables the client to acknowledge to the server
 * the messages that the client has received.
 * For the acknowledgement to work, the server must be configured with the
 * correspondent server-side ack extension. If both client and server support
 * the ack extension, then the ack functionality will take place automatically.
 * By enabling this extension, all messages arriving from the server will arrive
 * via the long poll, so the comet communication will be slightly chattier.
 * The fact that all messages will return via long poll means also that the
 * messages will arrive with total order, which is not guaranteed if messages
 * can arrive via both long poll and normal response.
 * Messages are not acknowledged one by one, but instead a group of messages is
 * acknowledged when long poll returns.
 */
org.cometd.AckExtension = function()
{
    var _cometd;
    var _serverSupportsAcks = false;
    var _ackId = -1;

    function _debug(text, args)
    {
        _cometd._debug(text, args);
    }

    this.registered = function(name, cometd)
    {
        _cometd = cometd;
        _debug('AckExtension: executing registration callback');
    };

    this.unregistered = function()
    {
        _debug('AckExtension: executing unregistration callback');
        _cometd = null;
    };

    this.incoming = function(message)
    {
        var channel = message.channel;
        if (channel == '/meta/handshake')
        {
            _serverSupportsAcks = message.ext && message.ext.ack;
            _debug('AckExtension: server supports acks', _serverSupportsAcks);
        }
        else if (_serverSupportsAcks && channel == '/meta/connect' && message.successful)
        {
            var ext = message.ext;
            if (ext && typeof ext.ack === 'number')
            {
                _ackId = ext.ack;
                _debug('AckExtension: server sent ack id', _ackId);
            }
        }
        return message;
    };

    this.outgoing = function(message)
    {
        var channel = message.channel;
        if (channel == '/meta/handshake')
        {
            if (!message.ext)
            {
                message.ext = {};
            }
            message.ext.ack = _cometd && _cometd.ackEnabled !== false;
            _ackId = -1;
        }
        else if (_serverSupportsAcks && channel == '/meta/connect')
        {
            if (!message.ext)
            {
                message.ext = {};
            }
            message.ext.ack = _ackId;
            _debug('AckExtension: client sending ack id', _ackId);
        }
        return message;
    };
};
return org.cometd;
});
//
// Binding for CometD that uses pure browser features, no toolkits.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*jslint white:false, bitwise:true, eqeqeq:true, immed:true, nomen:false, 
  onevar:false, plusplus:false, undef:true, browser:true, devel:true, 
  forin:false, sub:false*/
/*global define */
define('coweb/session/bayeux/cometd',[
    'coweb/util/xhr',
    'org/cometd'
], function(xhr, cometd) {
    // use browser native functions, http://caniuse.com/#search=JSON
    cometd.JSON.toJSON = JSON.stringify;
    cometd.JSON.fromJSON = JSON.parse;
    
    // build default instance
    var c = new cometd.Cometd();

    // implement abstract methods in required transports
    var LongPollingTransport = function() {
        var _super = new cometd.LongPollingTransport();
        var that = cometd.Transport.derive(_super);
        // implement abstract method
        that.xhrSend = function(packet) {
            packet.method = 'POST';
            packet.headers = packet.headers || {};
            packet.headers['Content-Type'] = 'application/json;charset=UTF-8';
            var promise = xhr.send(packet);
            promise.then(function(args) {
                packet.onSuccess(args.xhr.responseText);
            }, function(args) {
                var err = new Error('failed loading '+args.url+' status: '+args.xhr.status);
                packet.onError(args.xhr.statusText, err);
            });
            return promise.xhr;
        };
        return that;
    };

    // register transports
    // @todo: websocket disabled for now, make this a config option
    // if (window.WebSocket) {
    //     cometd.registerTransport('websocket', new org.cometd.WebSocketTransport());
    // }
    c.registerTransport('long-polling', new LongPollingTransport());
    
    // register required extension
    c.registerExtension('ack', new cometd.AckExtension());
    return c;
});//
// Adds coweb session IDs to the ext field of Bayeux messages. Required by
// the Java server implementation to distinguish sessions.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*jslint white:false, bitwise:true, eqeqeq:true, immed:true, nomen:false, 
  onevar:false, plusplus:false, undef:true, browser:true, devel:true, 
  forin:false, sub:false*/
/*global define*/
define('coweb/session/bayeux/CowebExtension',['require','exports','module'],function() {
    /**
     * @constructor
     * @param {String} args.sessionid Unique session ID received from the 
     * server in response to a SessionInterface.prepare
     */
    var CowebExtension = function(args) {
        this._cometd = null;
        this._sessionid = args.sessionid;
        this._updaterType = args.updaterType;
    };
    
    /**
     * Called when cometd registers the extension.
     *
     * @param {String} name
     * @param {Object} cometd
     */
    CowebExtension.prototype.registered = function(name, cometd) {
        this._cometd = cometd;
    };

    /**
     * Called when cometd unregisters the extension.
     *
     * @param {String} name
     * @param {Object} cometd
     */    
    CowebExtension.prototype.unregistered = function(name, cometd) {
        this._cometd = null;
    };
    
    /**
     * Called when the cometd passes an outgoing message to the extension.
     * Adds an ext.coweb.sessionid field to the object.
     *
     * @param {Object} msg
     */
    CowebExtension.prototype.outgoing = function(msg) {
        var ext = msg.ext = msg.ext || {};
        var coweb = msg.ext.coweb = msg.ext.coweb || {};
        coweb.sessionid = this._sessionid;
        coweb.updaterType = this._updaterType;
        return msg;
    };

    return CowebExtension;
});
//
// General JS utils.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
//
/*jslint white:false, bitwise:true, eqeqeq:true, immed:true, nomen:false, 
  onevar:false, plusplus:false, undef:true, browser:true, devel:true, 
  forin:false, sub:false*/
/*global define*/
define('coweb/util/lang',['require','exports','module'],function() {
    return {
        /**
         * Make an independent clone of a simple object.
         *
         * @todo review for performance
         * 
         * @param {Object} obj Object with simple properties
         * @returns {Object} Clone of the object
         */
        clone : function(obj) {
            return JSON.parse(JSON.stringify(obj));
        }
    };
});//
// Bridges the ListenerInterface to Bayeux/cometd.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*jslint white:false, bitwise:true, eqeqeq:true, immed:true, nomen:false, 
  onevar:false, plusplus:false, undef:true, browser:true, devel:true, 
  forin:false, sub:false*/
/*global define*/
define('coweb/session/bayeux/ListenerBridge',[
    'coweb/session/bayeux/cometd',
    'coweb/util/Promise',
    'coweb/util/lang'
], function(cometd, Promise, lang) {
    /**
     * @constructor
     * @param {Object} args.listener ListenerInterface instance
     * @param {Object} args.bridge SessionBridge instance
     */
    var ListenerBridge = function(args) {
        // constants
        this.IDLE = 0;
        this.UPDATING = 1;
        this.UPDATED = 2;
        
        // ListenerImpl
        this._listener = args.listener;
        // SessionImpl bridge 
        this._bridge = args.bridge;
        // /service/session/join/* subscription
        this._joinToken = null;
        // /session/roster/* subscription
        this._rosterToken = null;
        // /service/session/updater subscription
        this._updaterToken = null;
        // /session/sync/* subscription
        this._syncToken = null;
        // active requests for state
        this._stateReqs = {};
        // state of the join process
        this._state = this.IDLE;
        // service subscription tokens
        this._serviceSubs = {};
        // service request tokens
        this._serviceReqs = {};
        // public bot channel regex
        this._publicRegex = /^\/bot\/(.*)/;
        // private bot channel regex
        this._privateRegex = /^\/service\/bot\/([^\/]*)\/response/;
        // private bot channel regex
        this._requestRegex = /^\/service\/bot\/([^\/]*)\/request/;
        // update promise
        this._updatePromise = null;
        // messages queued during update
        this._updateQueue = [];
        // initial roster, cleared after first read of it
        this._roster = null;   
		
		this.syncChannel = '/session/sync/*';
		this.syncAppChannel = '/session/sync/app';
		this.syncEngineChannel = '/session/sync/engine';
		this.rosterChannel = "/session/roster/*";
    };
    var proto = ListenerBridge.prototype;


    /**
     * Publishes a local coweb event to the /session/sync Bayeux channel.
     *
     * @param {String} topic Event topic
     * @param {Object} value JSON-encodable event value
     * @param {String|null} type Event operation type
     * @param {Number} type Event integer linear position
     * @param {Number[]} context Event integer array context vector
     */
    proto.postSync = function(topic, value, type, position, context) {
		console.log('here here hereh we got it');
        // don't send events if we're not updated yet
        if(this._state !== this.UPDATED) { return; }        
        // publish to server
        cometd.publish(this.syncAppChannel, {
            topic : topic, 
            value : value,
            type : type,
            position : position,
            context : context
        });
        return true;
    };
    
    /**
     * Publishes a local op engine sync event to the /session/sync Bayeux 
     * channel.
     *
     * @param {Number[]} context Integer array context vector for this site
     */
    proto.postEngineSync = function(context) {
        // don't send events if we're not updated yet
        if(this._state !== this.UPDATED) { return; }        
        // publish to server
        //cometd.publish('/service/session/sync/engine', {context : context});
		cometd.publish(this.syncEngineChannel, {context : context});
   
        return true;
    };

    /**
     * Publishes a local snapshot of the shared state to the 
     * /service/session/updater Bayeux channel.
     *
     * @param {String} topic String topic identifying the portion of the state
     * @param {Object} value JSON-encodable object
     * @param {String} recipient Opaque ID created by the server identifying
     * the recipient (i.e., late-joiner)
     */
    proto.postStateResponse = function(topic, value, recipient) {
        var state = this._stateReqs[recipient];
        // no outstanding request for state, ignore this message
        if(state === undefined) { return; }
        if(topic) {
            // hold onto state
            value = lang.clone(value);
            state.push({topic: topic, value: value});
        } else {
            state = {
                token: recipient,
                state: state
            };
            // send all state to server            
            cometd.publish('/service/session/updater', state);
            // stop tracking state request
            delete this._stateReqs[recipient];
        }
    };

    /**
     * Subscribes to the /bot/<name> Bayeux channel.
     *
     * @param {String} service Name of the service bot
     */
    proto.postServiceSubscribe = function(service) {
        var info = this._serviceSubs[service];
        if(!info) {
            // one time subscribe
            var token = cometd.subscribe('/bot/'+service, this,
                '_onServiceBotPublish');
            info = {count: 0, token: token};
            this._serviceSubs[service] = info;
        }
        // increment subscriber count
        info.count += 1;
    };
    
    /**
     * Subscribes to the /service/bot/<name>/response Bayeux channel
     * and then publishes a request to /service/bot/<name>/request.
     *
     * @param {String} service Name of the service bot
     * @param {Object} params JSON-encodable args to pass to the bot
     * @param {String} topic String topic name which the response should carry
     */
    proto.postServiceRequest = function(service, params, topic) {
        var info = this._serviceReqs[service];
        if(!info) {
            this._serviceReqs[service] = info = {token: null, pending: {}};
        }
        if(!info.token) {
            // one time subscribe for bot responses, unless error occurs
            var ch = '/service/bot/'+service+'/response';
            var token = cometd.subscribe(ch, this, '_onServiceBotResponse');
            info.token = token;
        }
        // check for conflict in pending topics
        if(info.pending[topic]) {
           console.warn('bayeux.ListenerBridge: conflict in bot request topics ' + topic);
           return;
        }
        // publish the bot request
        cometd.publish('/service/bot/'+service+'/request', {
            value: params,
            topic : topic
        });
        // add topic to pending
        info.pending[topic] = true;
    };
    
    /**
     * Unsubscribes to the /bot/<name> Bayeux channel.
     *
     * @param {String} service Name of the service bot
     */ 
    proto.postServiceUnsubscribe = function(service) {
        var info = this._serviceSubs[service];
        if(!info) {
            // ignore, nothing to unsub
            delete this._serviceSubs[service];
            return;
        }
        // decrement subscriber count
        info.count -= 1;
        if(info.count <= 0) {
            if(info.token) {
                // send an unsub to sever if the token is still valid
                cometd.unsubscribe(info.token);
            }
            delete this._serviceSubs[service];
        }
    };

    
    /**
     * Triggers the start of the procedure to update the local, late-joining 
     * app to the current shared session state. Subscribes to the roster, sync,
     * and join channels to tickle the server into sending a copy of the full
     * session state.
     *
     * @returns {Promise} Resolved after the app updates to the received state
     */
    proto.initiateUpdate = function() {
		if(this._bridge.prepResponse.sessionIdInChannel) {
			this.syncChannel = '/session/'+this._bridge.prepResponse.sessionid+'/sync/*';
			this.syncAppChannel = '/session/'+this._bridge.prepResponse.sessionid+'/sync/app';
			this.syncEngineChannel = '/session/'+this._bridge.prepResponse.sessionid+'/sync/engine';
			this.rosterChannel = '/session/'+this._bridge.prepResponse.sessionid+'roster/*';
		}
		
        this._updatePromise = new Promise();

        // start listening for subscribe responses so we can track subscription
        // failures
        cometd.addListener('/meta/subscribe', this, '_onSubscribe');
        // start listening for publish responses so we can track subscription
        // failures
        cometd.addListener('/meta/publish', this, '_onPublish');

        // go into updating state
        this._state = this.UPDATING;
        // empty the queue of held events
        this._updateQueue = [];
        // batch these subscribes
        cometd.batch(this, function() {
            // subscribe to roster list
            this._rosterToken = cometd.subscribe(this.rosterChannel, 
                this, '_onSessionRoster');
            // subscribe to sync events
            //this._syncToken = cometd.subscribe('/service/session/sync/*', 
			this._syncToken = cometd.subscribe(this.syncChannel, 
                this, '_onSessionSync');
            // start the joining process
            this._joinToken = cometd.subscribe('/service/session/join/*', 
                this, '_onServiceSessionJoin');
        });
        
        return this._updatePromise;
    };
    
    /**
     * Gets the initial session roster. Clears the store roster after 
     * retrieval.
     *
     * @returns {Object} Roster of site IDs paired with user names at the time
     * the local app started to update itself in the session
     */
    proto.getInitialRoster = function() {
        var r = this._roster;
        this._roster = null;
        return r;
    };
    
    /**
     * Called when the server responds to any /meta/subscribe request. Notifies
     * the listener of failures to subscribe to requested services.
     * 
     * @private
     * @param {Object} msg Subscribe response message
     */
    proto._onSubscribe = function(msg) {
        // check if bot subscribes were successful or not
        var topic, info, segs;
        if(!msg.successful) {
            var ch = msg.subscription;
            var match = this._privateRegex.exec(ch);
            if(match) {
                // error subscribing to private bot response channel 
                // toss the subscription token
                info = this._serviceReqs[match[1]];
                // remove local listener only, sub never happened on server
                cometd.removeListener(info.token);
                info.token = null;
                // pull out error tag
                segs = msg.error.split(':');
                // inform all callbacks of error
                for(topic in info.pending) {
                    if(info.pending.hasOwnProperty(topic)) {
                        this._listener.serviceResponseInbound(topic, segs[2], 
                            true);
                    }
                }
                // reset list of topics pending responses
                info.pending = {};
            }
            match = this._publicRegex.exec(ch);
            if(match) {
                // error subscribing to public bot channel
                // toss the subscription token
                info = this._serviceSubs[match[1]];
                // remove local listener only, sub never happened on server
                cometd.removeListener(info.token);
                info.token = null;
                segs = msg.error.split(':');
                this._listener.servicePublishInbound(match[1], segs[2], true);
                // @todo: do we need to unsubscribe? toss tokens?
            }
            // console.warn('bayeux.ListenerBridge: unhandled subscription error ' + msg.error);
        }
    };
    
    /**
     * Called when the server responds to any publish message. Notifies the
     * listener of failures to post requests to requested bot services.
     *
     * @private
     * @param {Object} msg Publish response message
     */
    proto._onPublish = function(msg) {
        if(!msg.successful) {
            var ch = msg.channel;
            var match = this._requestRegex.exec(ch);
            if(match) {
                // error sending private bot request
                // toss the subscription token
                var info = this._serviceReqs[match[1]];
                // remove local listener only, sub never happened on server
                cometd.removeListener(info.token);
                info.token = null;
                // pull out error tag
                var segs = msg.error.split(':');
                // inform all callbacks of error
                for(var topic in info.pending) {
                    if(info.pending.hasOwnProperty(topic)) {
                        this._listener.serviceResponseInbound(topic, segs[2], 
                            true);
                    }
                }
                // reset list of topics pending responses
                info.pending = {};
                return;
            }
        }
    };

    /**
     * Called when the server publishes on a /service/session/join/ Bayeux
     * channel. Handles siteid, roster, and full state messages, passing 
     * information to the listener as needed.
     *
     * @private
     * @param {Object} msg Published message
     */
    proto._onServiceSessionJoin = function(msg) {
        // determine channel suffix
        var suffix = msg.channel.split('/');
        suffix = suffix[suffix.length-1];
        
        if(suffix === 'siteid') {
            // tell listener about site ID
            this._listener.setSiteID(msg.data);
        } else if(suffix === 'roster') {
            // store initial roster until we're ready
            this._roster = msg.data;
        } else if(suffix === 'state') {
            // handle state messages
            var promise = this._updatePromise;
            this._updatePromise = null;
            try {
                this._onServiceSessionJoinState(msg);
            } catch(e) {
                // note update failed
                promise.fail(new Error('bad-application-state'));
            }
            // initialize the listener with the listener bridge reference
            this._listener.start(this, this._bridge.prepResponse);
            // note updated
            promise.resolve();
        } else {
            // unknown message, ignore
            console.warn('bayeux.ListenerBridge: unknown message ' + msg.channel);
        }
    };

    /**
     * Called when the server sends a portion of the full application state
     * to this late-joining app instance. Forwards the state to the listener
     * for broadcast to the app. If applied properly, forwards any queued 
     * events held during the update process. Finally, publishes a message to
     * the /service/session/updater channel indicating this app instance can
     * now provide state to other late joiners.
     *
     * @private
     * @param {Object} msg Published state message
     */
    proto._onServiceSessionJoinState = function(msg) {
        var i, l, item;
        // tell listener about state, one item at a time
        for(i=0, l=msg.data.length; i < l; i++) {
            item = msg.data[i];
            try {
                this._listener.stateInbound(item.topic, item.value);
            } catch(e1) {
                console.warn('bayeux.ListenerBridge: application errored on received state ' +
                    e1.message);
                throw e1;
            }
        }
        
        // process all queued events
        for(i=0, l=this._updateQueue.length; i < l; i++) {
            item = this._updateQueue[i];
            try {
                this[item.mtd](item.args);
            } catch(e2) {
                console.warn('bayeux.ListenerBridge: application errored on queued event ' +
                    e2.message);
                throw e2;
            }
        }

        cometd.batch(this, function() {
            // unsubscribe from joining channel
            cometd.unsubscribe(this._joinToken);
            this._joinToken = null;
            // subscribe as an updater
            this._updaterToken = cometd.subscribe('/service/session/updater', 
                this, '_onServiceSessionUpdater');
        });
        
        // join is done
        this._state = this.UPDATED;
        this._updateQueue = [];
    };

    /**
     * Called to handle a /session/sync/ message. Forwards it to the listener
     * for processing by the op engine and/or broadcast to the local app.
     *
     * @private
     * @param {Object} msg Published coweb event message
     */
    proto._onSessionSync = function(msg) {
        var d = msg.data;
        if(this._state === this.UPDATING) {
            this._updateQueue.push({
                mtd : '_onSessionSync',
                args : msg
            });
            return;
        }
        var ch = msg.channel.split('/');
        var sch = ch[ch.length-1];
        // post to listener
        if(sch === 'engine') {
            // engine sync
            this._listener.engineSyncInbound(d.siteId, d.context);
        } else if(sch === 'app') {
            // app event sync
            this._listener.syncInbound(d.topic, d.value, d.type, d.position, 
                d.siteId, d.context, d.order);
        } else {
            console.warn('bayeux.ListenerBridge: received unknown sync ' + ch);
        }
    };
    
    /**
     * Called to handle a /session/roster/ message. Forwards it to the 
     * listener for broadcast to the local application.
     *
     * @private
     * @param {Object} msg Published roster message
     */
    proto._onSessionRoster = function(msg) {
        if(this._state === this.UPDATING) {
            this._updateQueue.push({
                mtd : '_onSessionRoster',
                args : msg
            });
            return;
        }
        
        // determine channel suffix
        var suffix = msg.channel.split('/');
        suffix = suffix[suffix.length-1];
        
        if(suffix === 'available' || suffix === 'unavailable') {
            this._listener.noticeInbound(suffix, msg.data);
        } else {
            // ignore unknown message
            console.warn('bayeux.ListenerBridge: unknown message ' + msg.channel);
        }
    };
    
    /**
     * Called to handle a message on the /service/session/updater Bayeux 
     * channel. Requests the full state of the local app.
     *
     * @private
     * @param {Object} msg Published state request message
     */
    proto._onServiceSessionUpdater = function(msg) {
        // note on-going request for state
        var token = msg.data;
        this._stateReqs[token] = [];
        
        try {
            this._listener.requestStateInbound(token);
        } catch(e) {
            // @todo: force disconnect because state is bad
            this._bridge.onDisconnected(this._bridge.id, 'bad-application-state');
        }
    };
    
    /**
     * Called to handle a message on the /bot/<name> Bayeux channel. Forwards
     * the bot broadcast to the listener.
     *
     * @private
     * @param {Object} msg Published service bot message
     */
    proto._onServiceBotPublish = function(msg) {
        var ch = msg.channel;
        var match = this._publicRegex.exec(ch);
        if(!match) {
           console.warn('bayeux.ListenerBridge: unknown bot publish ' + ch);
           return;
        }
        var serviceName = match[1];
        this._listener.servicePublishInbound(serviceName, msg.data.value, 
            false);
    };

    /**
     * Called to handle a message on the /service/bot/<name>/response Bayeux 
     * channel. Forwards the private bot response to the listener.
     *
     * @private
     * @param {Object} msg Published service bot message
     */   
    proto._onServiceBotResponse = function(msg) {
        var ch = msg.channel;
        var topic = msg.data.topic;
        var match = this._privateRegex.exec(ch);    
        if(!match) {
           console.warn('bayeux.ListenerBridge: unknown bot response ' + ch);
           return;
        }
        // clean up tracked topic
        var info = this._serviceReqs[match[1]];
        // check topic match for good measure
        if(!info.pending[topic]) {
            console.warn('bayeux.ListenerBridge: unknown bot response ' + ch);
            return;
        }
        delete info.pending[topic];
        // send to listener
        this._listener.serviceResponseInbound(topic, msg.data.value, 
            false);
    };
    
    return ListenerBridge;
});//
// Bridges the SessionInterface to Bayeux/cometd and the ListenerInterface.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*jslint white:false, bitwise:true, eqeqeq:true, immed:true, nomen:false, 
  onevar:false, plusplus:false, undef:true, browser:true, devel:true, 
  forin:false, sub:false*/
/*global define*/
define('coweb/session/bayeux/SessionBridge',[
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
		console.log('new session bridge');
		console.log(args);
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
     * @returns {Promise} Resolved on response from server
     */
    proto.prepare = function(key, collab, cacheState) {
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
            cacheState : cacheState
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
});//
// Bayeux implementation of the SessionInterface.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*jslint white:false, bitwise:true, eqeqeq:true, immed:true, nomen:false, 
  onevar:false, plusplus:false, undef:true, browser:true, devel:true, 
  forin:false, sub:false*/
/*global define window*/
define('coweb/session/BayeuxSession',[
    'coweb/session/bayeux/SessionBridge',
    'coweb/util/Promise',
    'coweb/util/xhr',
    'coweb/util/lang'
], function(SessionBridge, Promise, xhr, lang) {
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
    };
    var proto = BayeuxSession.prototype;

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
            throw new Error('prepare() not valid in current state');
        }
        params = params || {};

        // get url params
        var urlParams = {};
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
        this._bridge.prepare(params.key, params.collab, this._cacheState)
            .then('_onPrepared', '_onPrepareError', this);
        // start listening to disconnections
        this._bridge.disconnectPromise.then('_onDisconnected', null, this);

        // show the busy dialog for the prepare phase
        this.onStatusChange('preparing');

        // return promise
        return this._prepParams.promise;
    };
    
    /**
     * @private
     */
    proto._onPrepared = function(params) {
        // store response
        this._prepParams.response = JSON.parse(JSON.stringify(params));
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
            throw new Error('join() not valid in current state');
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
            throw new Error('update() not valid in current state');
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
//
// Topic constants for events.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*jslint white:false, bitwise:true, eqeqeq:true, immed:true, nomen:false, 
  onevar:false, plusplus:false, undef:true, browser:true, devel:true, 
  forin:false, sub:false*/
/*global define */
define('coweb/topics',['require','exports','module'],function() {
    var p = 'coweb.';
    return { 
        // prefix for all Hub messages
        PREFIX : p,
        // service bot topics
        SUB_SERVICE : p+'service.sub.',
        GET_SERVICE : p+'service.get.',
        UNSUB_SERVICE : p+'service.unsub.',
        SET_SERVICE : p+'service.response.',
        // operation topics
        SYNC : p+'sync.',
        // full state topics
        GET_STATE : p+'state.get',
        SET_STATE : p+'state.set.',
        ENGINE_STATE : p+'engine.state',
        ENGINE_SYNC : p+'engine.sync',
        PAUSE_STATE : p+'pause.state',
        // site joining and leaving topics
        SITE_JOIN : p+'site.join',
        SITE_LEAVE : p+'site.leave',
        READY : p+'site.ready',
        END : p+'site.end',
        // busy state topics
        BUSY : p+'busy.change',
        // pausing and resuming topics
        PAUSE_TOPIC : p+'topics.pause',
        RESUME_TOPIC : p+'topics.resume'
    };

});//
// Factory functions.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*jslint white:false, bitwise:true, eqeqeq:true, immed:true, nomen:false, 
  onevar:false, plusplus:false, undef:true, browser:true, devel:true, 
  forin:false, sub:false*/
/*global define*/
define('coweb/jsoe/factory',['require','exports','module'],function() {
    // for registered subclasses of Operation
    var typeMap = {};

    return {
        /**
         * Creates a history buffer key from a site ID and sequence ID.
         *
         * @param {Number} site Integer site ID
         * @param {Number} seq Integer sequence ID at that site
         * @returns {String} Key for use in get/set in the history buffer
         */
        createHistoryKey : function(site, seq) {
            return site + ',' + seq;
        },

        /** 
         * Register an operation class for the given type string.
         *
         * @param {String} type Operation type
         * @param {Object} cls Operation subclass
         */
        registerOperationForType : function(type, cls) {
            typeMap[type] = cls;
        },
    
        /**
         * Create a new operation given its type and constructor args.
         *
         * @param {String} type Registered operation type 
         * @param {Object} args Constructor arguments for the instance
         * @returns {Operation} Operation subclass instance
         */
        createOperationFromType : function(type, args) {
            var OpClass = typeMap[type];
            return new OpClass(args);
        },

        /**
         * Create a new operation given its array-form serialized state.
         *
         * @param {String} type Registered operation type 
         * @param {Object[]} state Serialized state from Operation.getState
         * @returns {Operation} Operation subclass instance
         */    
        createOperationFromState : function(state) {
            var OpClass = typeMap[state[0]];
            return new OpClass({state : state});
        }
    };
});//
// Difference between two contexts in terms of operations.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*jslint white:false, bitwise:true, eqeqeq:true, immed:true, nomen:false, 
  onevar:false, plusplus:false, undef:true, browser:true, devel:true, 
  forin:false, sub:false*/
/*global define*/
define('coweb/jsoe/ContextDifference',[
    'coweb/jsoe/factory'
], function(factory) {
    /**
     * Stores the difference in operations between two contexts in terms of 
     * site IDs and sequence numbers.
     *
     * @constructor
     */
    var ContextDifference = function() {
        this.sites = [];
        this.seqs = [];
    };
    

    /**
     * Adds a range of operations to the difference.
     *
     * @param {Number} site Integer site ID
     * @param {Number} start First integer operation sequence number, inclusive
     * @param {Number} end Last integer operation sequence number, exclusive
     */
    ContextDifference.prototype.addRange = function(site, start, end) {
        for(var i=start; i < end; i++) {
            this.addSiteSeq(site, i);
        }
    };

    /**
     * Adds a single operation to the difference.
     *
     * @param {Number} site Integer site ID
     * @param {Number} seq Integer sequence number
     */
    ContextDifference.prototype.addSiteSeq = function(site, seq) {
        this.sites.push(site);
        this.seqs.push(seq);        
    };

    /**
     * Gets the histor buffer keys for all the operations represented in this
     * context difference.
     *
     * @return {String[]} Array of keys for HistoryBuffer lookups
     */
    ContextDifference.prototype.getHistoryBufferKeys = function() {
        var arr = [];
        for(var i=0, l=this.seqs.length; i < l; i++) {
            var key = factory.createHistoryKey(this.sites[i], 
                this.seqs[i]);
            arr.push(key);
        }
        return arr;
    };

    /**
     * Converts the contents of this context difference to a string.
     *
     * @return {String} All keys in the difference (for debug)
     */
    ContextDifference.prototype.toString = function() {
        return this.getHistoryBufferKeys().toString();
    };
    
    return ContextDifference;
});
//
// Context vector representation of application state. Currently, just a state
// vector without undo support.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*jslint white:false, bitwise:true, eqeqeq:true, immed:true, nomen:false, 
  onevar:false, plusplus:false, undef:true, browser:true, devel:true, 
  forin:false, sub:false*/
/*global define*/
define('coweb/jsoe/ContextVector',[
    'coweb/jsoe/ContextDifference'
], function(ContextDifference) {
    /**
     * Represents the context in which an operation occurred at a site in 
     * terms of the operation sequence numbers already applied at that site or
     * the state of the document at the time.
     *
     * Initializes the sequence context vector based on the desired size of
     * the vector, an existing context vector, an array of integers from an
     * existing context vector, or the serialized state of an existing context
     * vector. At least one of these must be passed on the args parameter else
     * the constructor throws an exception. The argument properties are checked
     * in the order documented below. The first one encountered is used.
     *
     * @constructor
     * @param {Number} args.count Integer number of vector entries to 
     * initialize to zero
     * @param {ContextVector} args.contextVector Context vector to copy
     * @param {Number[]} args.sites Array from a context vector object to copy
     * @param {Number[]} args.state Array from a serialized context vector 
     * object to reference without copy
     */
    var ContextVector = function(args) {
        if(typeof args.count !== 'undefined') {
            this.sites = [];
            this.growTo(args.count);
        } else if(args.contextVector) {
            this.sites = args.contextVector.copySites();
        } else if(args.sites) {
            this.sites = args.sites.slice();
        } else if(args.state) {
            this.sites = args.state;
        } else {
            throw new Error('uninitialized context vector');
        }        
    };

    /**
     * Converts the contents of this context vector sites array to a string.
     *
     * @returns {String} All integers in the vector (for debug)
     */
    ContextVector.prototype.toString = function() {
        return '[' + this.sites.toString() + ']';
    };

    /**
     * Serializes this context vector.
     *
     * @returns {Number[]} Array of integer sequence numbers
     */
    ContextVector.prototype.getState = function() {
        return this.sites;
    };

    /**
     * Makes an independent copy of this context vector.
     *
     * @returns {ContextVector} Copy of this context vector
     */
    ContextVector.prototype.copy = function() {
        return new ContextVector({contextVector : this});
    };

    /**
     * Makes an independent copy of the array in this context vector.
     *
     * @return {Number[]} Copy of this context vector's sites array
     */
    ContextVector.prototype.copySites = function() {
        return this.sites.slice();
    };

    /**
     * Computes the difference in sequence numbers at each site between this
     * context vector and the one provided.
     *
     * @param {ContextVector} cv Other context vector object
     * @returns {ContextDifference} Represents the difference between this
     * vector and the one passed
     */
    ContextVector.prototype.subtract = function(cv) {
        var cd = new ContextDifference();
        for(var i=0; i < this.sites.length; i++) {
            var a = this.getSeqForSite(i);
            var b = cv.getSeqForSite(i);
            if(a-b > 0) {
                cd.addRange(i, b+1, a+1);
            }
        }
        return cd;
    };
    
    /**
     * Finds the oldest sequence number in the difference in sequence numbers
     * for each site between this context and the one provided.
     *
     * @param {ContextVector} cv Other context vector object
     * @returns {ContextDifference} Represents the oldest difference for each
     * site between this vector and the one passed
     */
    ContextVector.prototype.oldestDifference = function(cv) {
        var cd = new ContextDifference();
        for(var i=0; i < this.sites.length; i++) {
            var a = this.getSeqForSite(i);
            var b = cv.getSeqForSite(i);
            if(a-b > 0) {
                cd.addSiteSeq(i, b+1);
            }
        }
        return cd;
    };

    /**
     * Increases the size of the context vector to the given size. Initializes
     * new entries with zeros.
     *
     * @param {Number} count Desired integer size of the vector
     */
    ContextVector.prototype.growTo = function(count) {
        for(var i=this.sites.length; i < count; i++) {
            this.sites.push(0);
        }
    };

    /**
     * Gets the sequence number for the given site in this context vector.
     * Grows the vector if it does not include the site yet.
     * 
     * @param {Number} site Integer site ID
     * @returns {Number} Integer sequence number for the site
     */
    ContextVector.prototype.getSeqForSite = function(site) {
        if(this.sites.length <= site) {
            this.growTo(site+1);
        }
        return this.sites[site];
    };

    /**
     * Sets the sequence number for the given site in this context vector.
     * Grows the vector if it does not include the site yet.
     * 
     * @param {Number} site Integer site ID
     * @param {Number} seq Integer sequence number
     */
    ContextVector.prototype.setSeqForSite = function(site, seq) {
        if(this.sites.length <= site) {
            this.growTo(site+1);
        }
        this.sites[site] = seq;
    };

    /**
     * Gets the size of this context vector.
     *
     * @returns {Number} Integer size
     */
    ContextVector.prototype.getSize = function() {
        return this.sites.length;
    };

    /**
     * Determines if this context vector equals the other in terms of the
     * sequence IDs at each site. If the vectors are of different sizes, treats
     * missing entries as suffixed zeros.
     *
     * @param {ContextVector} cv Other context vector
     * @returns {Boolean} True if equal, false if not
     */
    ContextVector.prototype.equals = function(cv) {
        var a = this.sites;
        var b = cv.sites;
        // account for different size vectors
        var max = Math.max(a.length, b.length);
        for(var i=0; i < max; i++) {
            var va = (i < a.length) ? a[i] : 0;
            var vb = (i < b.length) ? b[i] : 0;
            if(va !== vb) {
                return false;
            }
        }
        return true;
    };

    /**
     * Computes an ordered comparison of two context vectors according to the
     * sequence IDs at each site. If the vectors are of different sizes, 
     * treats missing entries as suffixed zeros.
     *
     * @param {ContextVector} cv Other context vector
     * @returns {Number} -1 if this context vector is ordered before the other,
     *   0 if they are equal, or 1 if this context vector is ordered after the
     *   other
     */
    ContextVector.prototype.compare = function(cv) {
        var a = this.sites;
        var b = cv.sites;
        // acount for different size vectors
        var max = Math.max(a.length, b.length);
        for(var i=0; i < max; i++) {
            var va = (i < a.length) ? a[i] : 0;
            var vb = (i < b.length) ? b[i] : 0;            
            if(va < vb) {
                return -1;
            } else if(va > vb) {
                return 1;
            }
        }
        return 0;
    };
    
    return ContextVector;
});
//
// Table of context vectors of known sites.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*jslint white:false, bitwise:true, eqeqeq:true, immed:true, nomen:false, 
  onevar:false, plusplus:false, undef:true, browser:true, devel:true, 
  forin:false, sub:false*/
/*global define*/
define('coweb/jsoe/ContextVectorTable',[
    'coweb/jsoe/ContextVector'
], function(ContextVector) {
    /**
     * Stores the context of each site known at this site.
     *
     * Initializes the table to include the given context vector at the given
     * site index. Ensures the table has enough empty context vectors up to
     * the given site ID.
     *
     * Supports the freezing and unfreezing of slots in the table as the
     * corresponding sites start and stop participating in operational 
     * transformation.
     *
     * @constructor
     * @param {ContextVector} Context vector to store in the table at the
     * given index
     * @param {Number} index Integer site ID representing the index at which to
     * store the initial context vector
     */
    var ContextVectorTable = function(cv, site) {
        this.cvt = [];
        this.growTo(site+1);
        this.cvt[site] = cv;        
    };
    
    /**
     * Converts the contents of this context vector table to a string.
     *
     * @return {String} All context vectors in the table (for debug)
     */
    ContextVectorTable.prototype.toString = function() {
        var arr = [];
        for(var i = 0, l = this.cvt.length; i++; i < l) {
            var cv = this.cvt[i];
            arr[i] = cv.toString();
        }
        return arr.toString();
    };

    /**
     * Gets the index of each entry in the table frozen to (i.e., sharing a 
     * reference with, the given context vector, skipping the one noted in the 
     * skip param.
     *
     * @param {ContextVector} cv Context vector instance
     * @param {Number} skip Integer index to skip
     * @returns {Number[]} Integer indices of table slots referencing the
     * context vector
     */
    ContextVectorTable.prototype.getEquivalents = function(cv, skip) {
        var equiv = [];
        for(var i=0, l=this.cvt.length; i < l; i++) {
            if(i !== skip && this.cvt[i] === cv) {
                equiv.push(i);
            }
        }
        return equiv;
    };

    /**
     * Serializes the state of this context vector table for transmission.
     *
     * @returns {Array[]} Array of context vectors serialized as arrays
     */
    ContextVectorTable.prototype.getState = function() {
        var arr = [];
        for(var i=0, l=this.cvt.length; i < l; i++) {
            arr[i] = this.cvt[i].getState();
        }
        return arr;
    };

    /**
     * Unserializes context vector table contents to initialize this intance.
     *
     * @param {Array[]} arr Array in the format returned by getState
     */
    ContextVectorTable.prototype.setState = function(arr) {
        // clear out any existing state
        this.cvt = [];
        for(var i=0, l=arr.length; i < l; i++) {
            this.cvt[i] = new ContextVector({state : arr[i]});
        }
    };

    /**
     * Increases the size of the context vector table to the given size.
     * Inceases the size of all context vectors in the table to the given size.
     * Initializes new entries with zeroed context vectors.
     *
     * @param {Number} count Desired integer size
     */
    ContextVectorTable.prototype.growTo = function(count) {
        // grow all context vectors
        for(var i=0, l=this.cvt.length; i < l; i++) {
            this.cvt[i].growTo(count);
        }
        // add new vectors of proper size
        for(i=this.cvt.length; i < count; i++) {
            var cv = new ContextVector({count : count});
            this.cvt.push(cv);
        }
    };

    /**
     * Gets the context vector for the given site. Grows the table if it does 
     * not include the site yet and returns a zeroed context vector if so.
     *
     * @param {Number} site Integer site ID
     * @returns {ContextVector} Context vector for the given site
     */
    ContextVectorTable.prototype.getContextVector = function(site) {
        if(this.cvt.length <= site) {
            // grow to encompass the given site at least
            // this is not necessarily the final desired size...
            this.growTo(site+1);
        }
        return this.cvt[site];
    };

    /**
     * Sets the context vector for the given site. Grows the table if it does
     * not include the site yet.
     *
     * @param {Number} site Integer site ID
     * @param {ContextVector} cv Context vector instance
     */
    ContextVectorTable.prototype.updateWithContextVector = function(site, cv) {
        if(this.cvt.length <= site) {
            // grow to encompass the given site at least
            this.growTo(site+1);
        }
        if(cv.getSize() <= site) {
            // make sure the given cv is of the right size too
            cv.growTo(site+1);
        }
        this.cvt[site] = cv;
    };

    /**
     * Sets the context vector for the site on the given operation. Grows the 
     * table if it does not include the site yet.
     *
     * @param {Operation} op Operation with the site ID and context vector
     */
    ContextVectorTable.prototype.updateWithOperation = function(op) {
        // copy the context vector from the operation
        var cv = op.contextVector.copy();
        // upgrade the cv so it includes the op
        cv.setSeqForSite(op.siteId, op.seqId);
        // store the cv
        this.updateWithContextVector(op.siteId, cv);
    };

    /**
     * Gets the context vector with the minimum sequence number for each site
     * among all context vectors in the table. Gets null if the minimum
     * vector cannot be constructed because the table is empty.
     *
     * @returns {ContextVector|null} Minium context vector
     */
    ContextVectorTable.prototype.getMinimumContextVector = function() {
        // if table is empty, abort
        if(!this.cvt.length) {
            return null;
        }

        // start with first context vector as a guess of which is minimum
        var mcv = this.cvt[0].copy();

        for(var i=1, l=this.cvt.length; i < l; i++) {
            var cv = this.cvt[i];
            // cvt has to equal the max vector size contained within
            for(var site = 0; site < l; site++) {
                var seq = cv.getSeqForSite(site);
                var min = mcv.getSeqForSite(site);
                if(seq < min) {
                    // take smaller of the two sequences numbers for each site
                    mcv.setSeqForSite(site, seq);
                }
            }
        }
        return mcv;
    };

    return ContextVectorTable;
});
//
// Defines the base class for operations.
//
// @todo: probably shouldn't be a class for performance; a bunch of functions
// that act on raw js objects representing ops would cut out the serialize
// steps and make copy simpler most likely
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*jslint white:false, bitwise:true, eqeqeq:true, immed:true, nomen:false, 
  onevar:false, plusplus:false, undef:true, browser:true, devel:true, 
  forin:false, sub:false*/
/*global define*/
define('coweb/jsoe/Operation',[
    'coweb/jsoe/ContextVector'
], function(ContextVector) {
    /**
     * Contains information about a local or remote event for transformation.
     *
     * Initializes the operation from serialized state or individual props if
     * state is not defined in the args parameter.
     *
     * @param {Object[]} args.state Array in format returned by getState 
     * bundling the following individual parameter values
     * @param {Number} args.siteId Integer site ID where the op originated
     * @param {ContextVector} args.contextVector Context in which the op 
     * occurred
     * @param {String} args.key Name of the property the op affected
     * @param {String} args.value Value of the op
     * @param {Number} args.position Integer position of the op in a linear
     * collection
     * @param {Number} args.order Integer sequence number of the op in the 
     * total op order across all sites
     * @param {Number} args.seqId Integer sequence number of the op at its
     * originating site. If undefined, computed from the context vector and
     * site ID.
     * @param {Boolean} args.immutable True if the op cannot be changed, most
     * likely because it is in a history buffer somewhere
     * to this instance
     */
    var Operation = function(args) {
        if(args === undefined) {
            // abstract
            this.type = null;
            return;
        } else if(args.state) {
            // restore from state alone
            this.setState(args.state);
            // never local when building from serialized state
            this.local = false;
        } else {
            // use individual properties
            this.siteId = args.siteId;
            this.contextVector = args.contextVector;
            this.key = args.key;
            this.value = args.value;
            this.position = args.position;
            this.order = (args.order === undefined || args.order === null) ?
                Infinity : args.order;
            if(args.seqId !== undefined) { 
                this.seqId = args.seqId;
            } else if(this.contextVector) {
                this.seqId = this.contextVector.getSeqForSite(this.siteId) + 1;
            } else {
                throw new Error('missing sequence id for new operation');
            }
            this.xCache = args.xCache;
            this.local = args.local || false;
        }
        // always mutable to start
        this.immutable = false;
        // define the xcache if not set elsewhere
        if(!this.xCache) {
            this.xCache = [];
        }
        // always mutable to start
        this.immutable = false;
    };

    /**
     * Serializes the operation as an array of values for transmission.
     *
     * @return {Object[]} Array with the name of the operation type and all
     * of its instance variables as primitive JS types
     */
    Operation.prototype.getState = function() {
        // use an array to minimize the wire format
        var arr = [this.type, this.key, this.value, this.position, 
            this.contextVector.sites, this.seqId, this.siteId,
            this.order];
        return arr;
    };

    /**
     * Unserializes operation data and sets it as the instance data. Throws an
     * exception if the state is not from an operation of the same type.
     *
     * @param {Object[]} arr Array in the format returned by getState
     */
    Operation.prototype.setState = function(arr) {
        if(arr[0] !== this.type) {
            throw new Error('setState invoked with state from wrong op type');
        } else if(this.immutable) {
            throw new Error('op is immutable');
        }
        // name args as required by constructor
        this.key = arr[1];
        this.value = arr[2];
        this.position = arr[3];
        this.contextVector = new ContextVector({state : arr[4]});
        this.seqId = arr[5];
        this.siteId = arr[6];
        this.order = arr[7] || Infinity;
    };

    /**
     * Makes a copy of this operation object. Takes a shortcut and returns
     * a ref to this instance if the op is marked as mutable.
     *
     * @returns {Operation} Operation object
     */
    Operation.prototype.copy = function() {
        var args = {
            siteId : this.siteId,
            seqId : this.seqId,
            contextVector : this.contextVector.copy(),
            key : this.key,
            value : this.value,
            position : this.position,
            order : this.order,
            local : this.local,
            // reference existing xCache
            xCache : this.xCache
        };
        // respect subclasses
        var op = new this.constructor(args);
        return op;
    };

    /**
     * Gets a version of the given operation previously transformed into the
     * given context if available.
     *
     * @param {ContextVector} cv Context of the transformed op to seek
     * @returns {Operation|null} Copy of the transformed operation from the 
     * cache or null if not found in the cache
     */
    Operation.prototype.getFromCache = function(cv) {
        // check if the cv is a key in the xCache
        var cache = this.xCache,
            xop, i, l;
        for(i=0, l=cache.length; i<l; i++) {
            xop = cache[i];
            if(xop.contextVector.equals(cv)) {
                return xop.copy();
            }
        }
        return null;
    };

    /**
     * Caches a transformed copy of this original operation for faster future
     * transformations.
     *
     * @param {Number} Integer count of active sites, including the local one
     */
    Operation.prototype.addToCache = function(siteCount) {
        // pull some refs local
        var cache = this.xCache,
            cop = this.copy();

        // mark copy as immutable
        cop.immutable = true;

        // add a copy of this transformed op to the history
        cache.push(cop);

        // check the count of cached ops against number of sites - 1
        var diff = cache.length - (siteCount-1);
        if(diff > 0) {
            // if overflow, remove oldest op(s)
            cache = cache.slice(diff);
        }
    };

    /**
     * Computes an ordered comparison of this op and another based on their
     * context vectors. Used for sorting operations by their contexts.
     *
     * @param {Operation} op Other operation
     * @returns {Number} -1 if this op is ordered before the other, 0 if they
     * are in the same context, and 1 if this op is ordered after the other
     */
    Operation.prototype.compareByContext = function(op) {
        var rv = this.contextVector.compare(op.contextVector);
        if(rv === 0) {
            if(this.siteId < op.siteId) {
                return -1;
            } else if(this.siteId > op.siteId) {
                return 1;
            } else {
                return 0;
            }
        }
        return rv;
    };
    
    /**
     * Computes an ordered comparison of this op and another based on their
     * position in the total op order.
     *
     * @param {Operation} op Other operation
     * @returns {Number} -1 if this op is ordered before the other, 0 if they
     * are in the same context, and 1 if this op is ordered after the other
     */
    Operation.prototype.compareByOrder = function(op) {
        if(this.order === op.order) {
            // both unknown total order so next check if both ops are from
            // the same site or if one is from the local site and the other
            // remote
            if(this.local === op.local) {
                // compare sequence ids for local-local or remote-remote order
                return (this.seqId < op.seqId) ? -1 : 1;
            } else if(this.local && !op.local) {
                // this local op must appear after the remote one in the total
                // order as the remote one was included in the late joining 
                // state sent by the remote site to this one meaning it was
                // sent before this site finished joining
                return 1;
            } else if(!this.local && op.local) {
                // same as above, but this op is the remote one now
                return -1;
            }
        } else if(this.order < op.order) {
            return -1;
        } else if(this.order > op.order) {
            return 1;
        }
    };
    
    /**
     * Transforms this operation to include the effects of the operation
     * provided as a parameter IT(this, op). Upgrade the context of this
     * op to reflect the inclusion of the other.
     *
     * @returns {Operation|null} This operation, transformed in-place, or null
     * if its effects are nullified by the transform
     * @throws {Error} If this op to be transformed is immutable or if the
     * this operation subclass does not implement the transform method needed
     * to handle the passed op
     */
    Operation.prototype.transformWith = function(op) {
        if(this.immutable) {
            throw new Error('attempt to transform immutable op');
        }
        var func = this[op.transformMethod()], rv;
        if(!func) {
            throw new Error('operation cannot handle transform with type: '+ op.type);
        }
        // do the transform
        rv = func.apply(this, arguments);
        // check if op effects nullified
        if(rv) {
            // upgrade the context of this op to include the other
            this.upgradeContextTo(op);
        }
        return rv;
    };
    
    /**
     * Upgrades the context of this operation to reflect the inclusion of a
     * single other operation from some site.
     *
     * @param {Operation} The operation to include in the context of this op
     * @throws {Error} If this op to be upgraded is immutable
     */
    Operation.prototype.upgradeContextTo = function(op) {
        if(this.immutable) {
            throw new Error('attempt to upgrade context of immutable op');
        }
        this.contextVector.setSeqForSite(op.siteId, op.seqId);
    };

    /**
     * Gets the name of the method to use to transform this operation with
     * another based on the type of this operation defined by a subclass.
     *
     * Abstract implementation always throws an exception if not overriden.
     */ 
    Operation.prototype.getTransformMethod = function() {
        throw new Error('transformMethod not implemented');
    };

    return Operation;
});
//
// History buffer storing original operations.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*jslint white:false, bitwise:true, eqeqeq:true, immed:true, nomen:false, 
  onevar:false, plusplus:false, undef:true, browser:true, devel:true, 
  forin:false, sub:false*/
/*global define*/
define('coweb/jsoe/HistoryBuffer',[
    'coweb/jsoe/factory',
    'coweb/jsoe/Operation'
], function(factory, Operation) {
    /**
     * Stores information about local and remote operations for future 
     * transformations.
     *
     * @constructor
     */
    var HistoryBuffer = function() {
        this.ops = {};
        this.size = 0;    
    };

    /**
     * Serializes the history buffer contents to seed a remote instance.
     *
     * @return {Object[]} Serialized operations in the history
     */
    HistoryBuffer.prototype.getState = function() {
        // pack keys and values into linear array to minimize wire size
        var arr = [];
        var i = 0;
        for(var key in this.ops) {
            if(this.ops.hasOwnProperty(key)) {
                // only deal with values, keys can be rebuilt from them
                arr[i] = this.ops[key].getState();
                ++i;
            }
        }
        return arr;
    };

    /**
     * Unserializes history buffer contents to initialize this instance.
     *
     * @param {Object[]} arr Array in the format returned by getState
     */
    HistoryBuffer.prototype.setState = function(arr) {
        // reset internals
        this.size = 0;
        this.ops = {};
        for(var i=0; i < arr.length; i++) {
            // restore operations
            var op = factory.createOperationFromState(arr[i]);
            this.addLocal(op);
        }
    };

    /**
     * Retrieves all of the operations represented by the given context
     * differences from the history buffer. Sorts them by total order, placing
     * any ops with an unknown place in the order (i.e., local ops) at the end
     * sorted by their sequence IDs. Throws an exception when a requested 
     * operation is missing from the history.
     *
     * @param {ContextDifference} cd  Context difference object
     * @returns {Operation[]} Sorted operations
     */ 
    HistoryBuffer.prototype.getOpsForDifference = function(cd) {
        // get the ops
        var keys = cd.getHistoryBufferKeys();
        var ops = [];
        for(var i=0, l=keys.length; i < l; i++) {
            var key = keys[i];
            var op = this.ops[key];
            if(op === undefined) {
                throw new Error('missing op for context diff: i=' + i + 
                    ' key=' + key + ' keys=' + keys.toString());
            }
            ops.push(op);
        }
        // sort by total order
        ops.sort(function(a,b) { return a.compareByOrder(b); });
        return ops;
    };

    /**
     * Adds a local operation to the history.
     *
     * @param {Operation} Local operation to add
     */
    HistoryBuffer.prototype.addLocal = function(op) {
        var key = factory.createHistoryKey(op.siteId, op.seqId);
        this.ops[key] = op;
        // make sure ops in the history never change
        op.immutable = true;
        ++this.size;
    };

    /**
     * Adds a received operation to the history. If the operation already 
     * exists in the history, simply updates its order attribute. If not, 
     * adds it. Throws an exception if the op does not include its place in 
     * the total order or if the op with the same key already has an assigned
     * place in the total order.
     *
     * @param {Operation} Received operation to add
     */
    HistoryBuffer.prototype.addRemote = function(op) {
        var key = factory.createHistoryKey(op.siteId, op.seqId);
        var eop = this.ops[key];
        if(op.order === null || op.order === undefined || 
        op.order === Infinity) {
            // remote op must have order set by server
            throw new Error('remote op missing total order');
        } else if(eop) {
            if(eop.order !== Infinity) {
                // order should never repeat
                throw new Error('duplicate op in total order: old='+eop.order +
                    ' new='+op.order);
            }
            // server has responded with known total order for an op this site
            // previously sent; update the local op with the info
            eop.order = op.order;
        } else {
            // add new remote op to history
            this.ops[key] = op;
            op.immutable = true;
            ++this.size;
        }
    };

    /**
     * Removes and returns an operation in the history.
     *
     * @param {Operation} op Operation to locate for removal
     * @returns {Operation} Removed operation
     */
    HistoryBuffer.prototype.remove = function(op) {
        var key = factory.createHistoryKey(op.siteId, op.seqId);
        op = this.ops[key];
        delete this.ops[key];
        // no longer in the history, so allow mutation
        op.immutable = false;
        --this.size;
        return op;
    };

    /**
     * Gets the number of operations in the history.
     *
     * @returns {Number} Integer count
     */
    HistoryBuffer.prototype.getCount = function() {
        return this.size;
    };

    /**
     * Gets all operations in the history buffer sorted by context.
     *
     * @returns {Operation[]} Sorted operations
     */
    HistoryBuffer.prototype.getContextSortedOperations = function() {
        var ops = [];
        // put all ops into an array
        for(var key in this.ops) {
            if(this.ops.hasOwnProperty(key)) {
                ops.push(this.ops[key]);
            }
        }
        // sort them by context, sequence, and site
        ops.sort(function(a,b) { return a.compareByContext(b); });
        return ops;
    };
    
    return HistoryBuffer;
});
//
// Represents an update operation that replaces the value of one property
// with another.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*jslint white:false, bitwise:true, eqeqeq:true, immed:true, nomen:false, 
  onevar:false, plusplus:false, undef:true, browser:true, devel:true, 
  forin:false, sub:false*/
/*global define*/
define('coweb/jsoe/UpdateOperation',[
    'coweb/jsoe/Operation',
    'coweb/jsoe/factory'
], function(Operation, factory) {
    /**
     * @constructor
     */
    var UpdateOperation = function(args) {
        this.type = 'update';
        Operation.call(this, args);
    };
    UpdateOperation.prototype = new Operation();
    UpdateOperation.prototype.constructor = UpdateOperation;
    factory.registerOperationForType('update', UpdateOperation);

    /**
     * Gets the method name to use to transform another operation against this
     * update operation.
     *
     * @return {String} Method name
     */
    UpdateOperation.prototype.transformMethod = function() {
        return 'transformWithUpdate';
    };

    /**
     * Transforms this update to include the effect of an update.
     *
     * @param {UpdateOperation} op Update to include in this op
     * @returns {UpdateOperation} This instance
     */
    UpdateOperation.prototype.transformWithUpdate = function(op) {
        if((op.position !== this.position) || (op.key !== this.key)) {
            return this;
        }

        if(this.siteId > op.siteId) {
            this.value = op.value;
        } else if((this.siteId === op.siteId) && (this.seqId < op.seqId)) {
            this.value = op.value;
        }
        return this;
    };

    /**
     * Transforms this update to include the effect of an insert.
     *
     * @param {InsertOperation} op Insert to include in this op
     * @returns {UpdateOperation} This instance
     */
    UpdateOperation.prototype.transformWithInsert = function(op) {
        if(this.key !== op.key) {
            return this;
        }
        if(this.position >= op.position) {
            ++this.position;
        }
        return this;
    };

    /**
     * Transforms this update to include the effect of a delete.
     *
     * @param {DeleteOperation} op Delete to include in this op
     * @returns {UpdateOperation} This instance
     */
    UpdateOperation.prototype.transformWithDelete = function(op) {
        if(this.key !== op.key) {
            return this;
        }
        if(this.position > op.position) {
            --this.position;
        } else if(this.position === op.position) {
            return null;
        }
        return this;
    };
    
    return UpdateOperation;
});
//
// Represents an insert operation that adds a value to a linear collection.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*jslint white:false, bitwise:true, eqeqeq:true, immed:true, nomen:false, 
  onevar:false, plusplus:false, undef:true, browser:true, devel:true, 
  forin:false, sub:false*/
/*global define*/
define('coweb/jsoe/InsertOperation',[
    'coweb/jsoe/Operation',
    'coweb/jsoe/factory'
], function(Operation, factory) {
    /**
     * @constructor
     */
    var InsertOperation = function(args) {
        this.type = 'insert';
        Operation.call(this, args);
    };
    InsertOperation.prototype = new Operation();
    InsertOperation.prototype.constructor = InsertOperation;
    factory.registerOperationForType('insert', InsertOperation);
        
    /**
     * Gets the method name to use to transform another operation against this
     * insert operation.
     *
     * @returns {String} Method name
     */
    InsertOperation.prototype.transformMethod = function() {
        return 'transformWithInsert';
    };

    /**
     * No-op. Update has no effect on an insert.
     *
     * @param {UpdateOperation} op Update to include in this op
     * @returns {InsertOperation} This instance
     */
    InsertOperation.prototype.transformWithUpdate = function(op) {
        return this;
    };

    /**
     * Transforms this insert to include the effect of an insert. Assumes 
     * the control algorithm breaks the CP2 pre-req to ensure convergence.
     *
     * @param {InsertOperation} op Insert to include in this op
     * @returns {InsertOperation} This instance
     */
    InsertOperation.prototype.transformWithInsert = function(op) {
        if(this.key !== op.key) {
            return this;
        }

        if(this.position > op.position || 
            (this.position === op.position && this.siteId <= op.siteId)) {
            ++this.position;
        }
        return this;
    };

    /**
     * Transforms this insert to include the effect of a delete.
     *
     * @param {DeleteOperation} op Delete to include in this op
     * @return {InsertOperation} This instance
     */
    InsertOperation.prototype.transformWithDelete = function(op) {
        if(this.key !== op.key) {
            return this;
        }
        if(this.position > op.position) {
            --this.position;
        }
        return this;
    };
    
    return InsertOperation;
});
//
// Represents a delete operation that removes a value from a linear 
// collection.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*jslint white:false, bitwise:true, eqeqeq:true, immed:true, nomen:false, 
  onevar:false, plusplus:false, undef:true, browser:true, devel:true, 
  forin:false, sub:false*/
/*global define*/
define('coweb/jsoe/DeleteOperation',[
    'coweb/jsoe/Operation',
    'coweb/jsoe/factory'
], function(Operation, factory) {
    /**
     * @constructor
     */
    var DeleteOperation = function(args) {
        this.type = 'delete';
        Operation.call(this, args);
    };
    DeleteOperation.prototype = new Operation();
    DeleteOperation.prototype.constructor = DeleteOperation;
    factory.registerOperationForType('delete', DeleteOperation);
    
    /**
     * Gets the method name to use to transform another operation against this
     * delete operation.
     *
     * @returns {String} Method name
     */
    DeleteOperation.prototype.transformMethod = function() {
        return 'transformWithDelete';
    };

    /**
     * No-op. Update has no effect on a delete.
     *
     * @param {UpdateOperation} op Update to include in this op
     * @returns {DeleteOperation} This instance
     */
    DeleteOperation.prototype.transformWithUpdate = function(op) {
        return this;
    };

    /**
     * Transforms this delete to include the effect of an insert.
     *
     * @param {InsertOperation} op Insert to include in this op
     * @returns {DeleteOperation} This instance
     */
    DeleteOperation.prototype.transformWithInsert = function(op) {
        if(this.key !== op.key) {
            return this;
        }
        if(this.position >= op.position) {
            ++this.position;
        }
        return this;
    };

    /**
     * Transforms this delete to include the effect of a delete.
     *
     * @param {DeleteOperation} op Delete to include in this op
     * @returns {DeleteOperation|null} This instance or null if this op has no
     * further effect on other operations
     */
    DeleteOperation.prototype.transformWithDelete = function(op) {
        if(this.key !== op.key) {
            return this;
        }
        if(this.position > op.position) {
            --this.position;
        } else if(this.position === op.position) {
            return null;
        }
        return this;
    };
    
    return DeleteOperation;
});
//
// Operation engine public API.
//
// @todo: refactor ops to IT funcs on std objects for performance
// 
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*jslint white:false, bitwise:true, eqeqeq:true, immed:true, nomen:false, 
  onevar:false, plusplus:false, undef:true, browser:true, devel:true, 
  forin:false, sub:false*/
/*global define*/
define('coweb/jsoe/OperationEngine',[
    'coweb/jsoe/ContextVectorTable',
    'coweb/jsoe/ContextVector',
    'coweb/jsoe/HistoryBuffer',
    'coweb/jsoe/factory',
    // load subclasses to get them registered with the factory
    'coweb/jsoe/UpdateOperation',
    'coweb/jsoe/InsertOperation',
    'coweb/jsoe/DeleteOperation'
], function(ContextVectorTable, ContextVector, HistoryBuffer, factory) {
    /**
     * Controls the operational transformation algorithm. Provides a public
     * API for operation processing, garbage collection, and engine 
     * synchronization.
     *
     * @constructor
     * @param {Number} siteId Unique integer site ID for this engine instance
     */
    var OperationEngine = function(siteId) {
        this.siteId = siteId;
        this.cv = new ContextVector({count : siteId+1});
        this.cvt = new ContextVectorTable(this.cv, siteId);
        this.hb = new HistoryBuffer();
        this.siteCount = 1;
    };

    /**
     * Gets the state of this engine instance to seed a new instance.
     *
     * @return {Object[]} Array or serialized state
     */
    OperationEngine.prototype.getState = function() {
        // op engine state can be cloned from cvt, hb, site ID, and frozen slots
        // get indices of frozen cvt slots
        var frozen = this.cvt.getEquivalents(this.cv, this.siteId);
        return [this.cvt.getState(), this.hb.getState(), this.siteId, frozen];
    };
    
    /**
     * Sets the state of this engine instance to state received from another
     * instance.
     *
     * @param {Object[]} arr Array in the format returned by getState
     */
    OperationEngine.prototype.setState = function(arr) {
        // configure the history buffer and context vector table
        this.cvt.setState(arr[0]);
        this.hb.setState(arr[1]);
        // pull out the context vector for the sending site
        this.cv = this.cvt.getContextVector(arr[2]);
        // copy it
        this.cv = this.cv.copy();
        // freeze our own site slot
        this.cvt.updateWithContextVector(this.siteId, this.cv);
        // set the initial count of active sites; freeze below will adjust
        this.siteCount = this.cv.getSize();
        // freeze all sites that must be frozen
        var frozen = arr[3];
        for(var i=0, l=frozen.length; i < l; i++) {
            this.freezeSite(frozen[i]);
        }
    };

    /**
     * Makes a copy of the engine context vector representing the local 
     * document state.
     *
     * @returns {ContextVector} Copy of the context vector for the local site
     */
    OperationEngine.prototype.copyContextVector = function() {
        return this.cv.copy();
    };

    /**
     * Factory method that creates an operation object initialized with the
     * given values.
     *
     * @param {Boolean} local True if the operation was originated locally, 
     * false if not
     * @param {String} key Operation key
     * @param {String} value Operation value
     * @param {String} type Type of operation: update, insert, delete
     * @param {Number} position Operation integer position
     * @param {Number} site Integer site ID where a remote op originated. 
     * Ignored for local operations which adopt the local site ID.
     * @param {ContextVector} cv Operation context. Ignored for local
     * operations which adopt the local site context.
     * @param {Number} order Place of the operation in the total order. Ignored
     * for local operations which are not yet assigned a place in the order.
     * @returns {Operation} Subclass instance matching the given type
     */
    OperationEngine.prototype.createOp = function(local, key, value, type, 
    position, site, cv, order) {
        var args;
        if(local) {
            args = {
                key : key,
                position : position,
                value : value,
                siteId : this.siteId,
                contextVector : this.copyContextVector(),
                local : true
            };
        } else {
            // build cv from raw sites array
            cv = new ContextVector({sites : cv});
            args = {
                key : key,
                position : position,
                value : value,
                siteId : site,
                contextVector : cv,
                order : order,
                local : false
            };
        }
        return factory.createOperationFromType(type, args);
    };

    /**
     * Creates an operation object and pushes it into the operation engine
     * algorithm. The parameters and return value are the same as those
     * documented for createOp.
     */
    OperationEngine.prototype.push = function(local) {
        var op = this.createOp.apply(this, arguments);
        if(local) {
            return this.pushLocalOp(op);
        } else {
            return this.pushRemoteOp(op);
        }
    };

    /**
     * Procceses a local operation and adds it to the history buffer.
     *
     * @param {Operation} Local operation
     * @returns {Operation} Reference to the pass parameter
     */
    OperationEngine.prototype.pushLocalOp = function(op) {
        // update local context vector
        this.cv.setSeqForSite(op.siteId, op.seqId);
        // add to history buffer
        this.hb.addLocal(op);
        return op;
    };

    /**
     * Procceses a remote operation, transforming it if required, and adds
     * the original to the history buffer.
     *
     * @param {Operation} Remote operation
     * @returns {Operation|null} New, transformed operation object or null if
     * the effect of the passed operation is nothing and should not be applied
     * to the shared state
     */
    OperationEngine.prototype.pushRemoteOp = function(op) {
        var top = null;

        if(this.hasProcessedOp(op)) {
            // let the history buffer track the total order for the op
            this.hb.addRemote(op);
            // engine has already processed this op so ignore it
            return null;
        } else if(this.cv.equals(op.contextVector)) {
            // no transform needed
            // make a copy so return value is independent of input
            top = op.copy();
        } else {
            // transform needed to upgrade context
            var cd = this.cv.subtract(op.contextVector);
            // make the original op immutable
            op.immutable = true;
            // top is a transformed copy of the original
            top = this._transform(op, cd);
        }

        // update local context vector with the original op
        this.cv.setSeqForSite(op.siteId, op.seqId);
        // store original op
        this.hb.addRemote(op);
        // update context vector table with original op
        this.cvt.updateWithOperation(op);

        // return the transformed op
        return top;
    };

    /**
     * Processes an engine synchronization event.
     *
     * @param {Number} site Integer site ID of where the sync originated
     * @param {ContextVector} cv Context vector sent by the engine at that site
     */
    OperationEngine.prototype.pushSync = function(site, cv) {
        // update the context vector table
        this.cvt.updateWithContextVector(site, cv);
    };

    /**
     * Processes an engine synchronization event.
     *
     * @param {Number} site Integer site ID of where the sync originated
     * @param {Number[]} Array form of the context vector sent by the site
     */
    OperationEngine.prototype.pushSyncWithSites = function(site, sites) {
        // build a context vector from raw site data
        var cv = new ContextVector({state : sites});
        this.pushSync(site, cv);
    };

    /**
     * Runs the garbage collection algorithm over the history buffer.
     *
     * @returns {ContextVector|null} Compiuted minimum context vector of the
     * earliest operation garbage collected or null if garbage collection
     * did not run
     */
    OperationEngine.prototype.purge = function() {
        if(this.getBufferSize() === 0) {
            // exit quickly if there is nothing to purge
            return null;
        }
        // get minimum context vector
        var mcv = this.cvt.getMinimumContextVector();
        
        if(mcv === null) {
            // exit quickly if there is no mcv
            return null;
        }

        var min_op; 
        var cd = this.cv.oldestDifference(mcv);
        var ops = this.hb.getOpsForDifference(cd);
        while(ops.length) {
            // get an op from the list we have yet to process
            var curr = ops.pop();
            // if we haven't picked a minimum op yet OR
            // the current op is before the minimum op in context
            if(min_op === undefined || curr.compareByContext(min_op) === -1) {
                // compute the oldest difference between the document state
                // and the current op
                cd = this.cv.oldestDifference(curr.contextVector);
                // add the operations in this difference to the list to process
                ops = ops.concat(this.hb.getOpsForDifference(cd));
                // make the current op the new minimum
                min_op = curr;
            }
        }

        // get history buffer contents sorted by context dependencies
        ops = this.hb.getContextSortedOperations();
        // remove keys until we hit the min
        for(var i=0; i < ops.length; i++) {
            var op = ops[i];
            // if there is no minimum op OR
            // if this op is not the minimium
            if(min_op === undefined || 
               (min_op.siteId !== op.siteId || min_op.seqId !== op.seqId)) {
                // remove operation from history buffer
                this.hb.remove(op);
            } else {
                // don't remove any more ops with context greater than or 
                // equal to the minimum
                break;
            }
        }
        return mcv;
    };

    /**
     * Gets the size of the history buffer in terms of stored operations.
     * 
     * @returns {Number} Integer size
     */
    OperationEngine.prototype.getBufferSize = function() {
        return this.hb.getCount();
    };

    /**
     * Gets if the engine has already processed the give operation based on
     * its context vector and the context vector of this engine instance.
     *
     * @param {Operation} op Operation to check
     * @returns {Boolean} True if the engine already processed this operation,
     * false if not
     */
    OperationEngine.prototype.hasProcessedOp = function(op) {
        var seqId = this.cv.getSeqForSite(op.siteId);
        // console.log('op processed? %s: this.cv=%s, seqId=%d, op.siteId=%d, op.cv=%s, op.seqId=%d',
        //     (seqId >= op.seqId), this.cv.toString(), seqId, op.siteId, op.contextVector.toString(), op.seqId);
        return (seqId >= op.seqId);
    };

    /**
     * Freezes a slot in the context vector table by inserting a reference
     * to context vector of this engine. Should be invoked when a remote site
     * stops participating.
     *
     * @param {Number} site Integer ID of the site to freeze
     */
    OperationEngine.prototype.freezeSite = function(site) {
        // ignore if already frozen
        if(this.cvt.getContextVector(site) !== this.cv) {
            // insert a ref to this site's cv into the cvt for the given site
            this.cvt.updateWithContextVector(site, this.cv);
            // one less site participating now
            this.siteCount--;
        }
    };

    /**
     * Thaws a slot in the context vector table by inserting a zeroed context
     * vector into the context vector table. Should be invoked before 
     * processing the first operation from a new remote site.
     *
     * @param {Number} site Integer ID of the site to thaw
     */
    OperationEngine.prototype.thawSite = function(site) {
        // don't ever thaw the slot for our own site
        if(site === this.siteId) {return;}
        // get the minimum context vector
        var cv = this.cvt.getMinimumContextVector();
        // grow it to include the site if needed
        cv.growTo(site);
        // use it as the initial context of the site
        this.cvt.updateWithContextVector(site, cv);
        // one more site participating now
        this.siteCount++;
    };
    
    /**
     * Gets the number of sites known to be participating, including this site.
     *
     * @returns {Number} Integer count
     */
    OperationEngine.prototype.getSiteCount = function() {
        return this.siteCount;
    };

    /**
     * Executes a recursive step in the operation transformation control 
     * algorithm. This method assumes it will NOT be called if no 
     * transformation is needed in order to reduce the number of operation
     * copies needed.
     *
     * @param {Operation} op Operation to transform
     * @param {ContextDifference} cd Context vector difference between the 
     * given op and the document state at the time of this recursive call
     * @returns {Operation|null} A new operation, including the effects of all 
     * of the operations in the context difference or null if the operation 
     * can have no further effect on the document state
     */
    OperationEngine.prototype._transform = function(op, cd) {
        // get all ops for context different from history buffer sorted by
        //   context dependencies
        var ops = this.hb.getOpsForDifference(cd),
            xcd, xop, cxop, cop, i, l;
        // copy the incoming operation to avoid disturbing the history buffer
        //   when the op comes from our history buffer during a recursive step
        op = op.copy();
        // iterate over all operations in the difference
        for(i=0, l=ops.length; i < l; i++) {
            // xop is the previously applied op
            xop = ops[i];
            if(!op.contextVector.equals(xop.contextVector)) {
                // see if we've cached a transform of this op in the desired
                // context to avoid recursion
                cxop = xop.getFromCache(op.contextVector);
                // cxop = null;
                if(cxop) {
                    xop = cxop;
                } else {                
                    // transform needed to upgrade context of xop to op
                    xcd = op.contextVector.subtract(xop.contextVector);
                    if(!xcd.sites.length) {
                        throw new Error('transform produced empty context diff');
                    }
                    // we'll get a copy back from the recursion
                    cxop = this._transform(xop, xcd);
                    if(cxop === null) {
                        // xop was invalidated by a previous op during the 
                        // transform so it has no effect on the current op; 
                        // upgrade context immediately and continue with
                        // the next one
                        op.upgradeContextTo(xop);
                        // @todo: see null below
                        continue;
                    }
                    // now only deal with the copy
                    xop = cxop;
                }
            }
            if(!op.contextVector.equals(xop.contextVector)) {
                throw new Error('context vectors unequal after upgrade');
            }
            // make a copy of the op as is before transform
            cop = op.copy();            
            // transform op to include xop now that contexts match IT(op, xop)
            op = op.transformWith(xop);
            if(op === null) {
                // op target was deleted by another earlier op so return now
                // do not continue because no further transforms have any
                // meaning on this op
                // @todo: i bet we want to remove this shortcut if we're
                //   deep in recursion when we find a dead op; instead cache it
                //   so we don't come down here again
                return null;
            }
            // cache the transformed op
            op.addToCache(this.siteCount);

            // do a symmetric transform on a copy of xop too while we're here
            xop = xop.copy();
            xop = xop.transformWith(cop);
            if(xop) {
                xop.addToCache(this.siteCount);
            }
        }
        // op is always a copy because we never entered this method if no
        // transform was needed
        return op;
    };
    
    return OperationEngine;
});
define('org/OpenAjax',['require','exports','module'],function () {
/*******************************************************************************
 * OpenAjax.js
 *
 * Reference implementation of the OpenAjax Hub, as specified by OpenAjax Alliance.
 * Specification is under development at: 
 *
 *   http://www.openajax.org/member/wiki/OpenAjax_Hub_Specification
 *
 * Copyright 2006-2008 OpenAjax Alliance
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not 
 * use this file except in compliance with the License. You may obtain a copy 
 * of the License at http://www.apache.org/licenses/LICENSE-2.0 . Unless 
 * required by applicable law or agreed to in writing, software distributed 
 * under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR 
 * CONDITIONS OF ANY KIND, either express or implied. See the License for the 
 * specific language governing permissions and limitations under the License.
 *
 ******************************************************************************/

// prevent re-definition of the OpenAjax object
if(!window["OpenAjax"]){
	OpenAjax = new function(){
		var t = true;
		var f = false;
		var g = window;
		var libs;
		var ooh = "org.openajax.hub.";

		var h = {};
		this.hub = h;
		h.implementer = "http://openajax.org";
		h.implVersion = "1.0";
		h.specVersion = "1.0";
		h.implExtraData = {};
		var libs = {};
		h.libraries = libs;

		h.registerLibrary = function(prefix, nsURL, version, extra){
			libs[prefix] = {
				prefix: prefix,
				namespaceURI: nsURL,
				version: version,
				extraData: extra 
			};
			this.publish(ooh+"registerLibrary", libs[prefix]);
		}
		h.unregisterLibrary = function(prefix){
			this.publish(ooh+"unregisterLibrary", libs[prefix]);
			delete libs[prefix];
		}

		h._subscriptions = { c:{}, s:[] };
		h._cleanup = [];
		h._subIndex = 0;
		h._pubDepth = 0;

		h.subscribe = function(name, callback, scope, subscriberData, filter)			
		{
			if(!scope){
				scope = window;
			}
			var handle = name + "." + this._subIndex;
			var sub = { scope: scope, cb: callback, fcb: filter, data: subscriberData, sid: this._subIndex++, hdl: handle };
			var path = name.split(".");
	 		this._subscribe(this._subscriptions, path, 0, sub);
			return handle;
		}

		h.publish = function(name, message)		
		{
			var path = name.split(".");
			this._pubDepth++;
			this._publish(this._subscriptions, path, 0, name, message);
			this._pubDepth--;
			if((this._cleanup.length > 0) && (this._pubDepth == 0)) {
				for(var i = 0; i < this._cleanup.length; i++) 
					this.unsubscribe(this._cleanup[i].hdl);
				delete(this._cleanup);
				this._cleanup = [];
			}
		}

		h.unsubscribe = function(sub) 
		{
			var path = sub.split(".");
			var sid = path.pop();
			this._unsubscribe(this._subscriptions, path, 0, sid);
		}
		
		h._subscribe = function(tree, path, index, sub) 
		{
			var token = path[index];
			if(index == path.length) 	
				tree.s.push(sub);
			else { 
				if(typeof tree.c == "undefined")
					 tree.c = {};
				if(typeof tree.c[token] == "undefined") {
					tree.c[token] = { c: {}, s: [] }; 
					this._subscribe(tree.c[token], path, index + 1, sub);
				}
				else 
					this._subscribe( tree.c[token], path, index + 1, sub);
			}
		}

		h._publish = function(tree, path, index, name, msg) {
			if(typeof tree != "undefined") {
				var node;
				if(index == path.length) {
					node = tree;
				} else {
					this._publish(tree.c[path[index]], path, index + 1, name, msg);
					this._publish(tree.c["*"], path, index + 1, name, msg);			
					node = tree.c["**"];
				}
				if(typeof node != "undefined") {
					var callbacks = node.s;
					var max = callbacks.length;
					for(var i = 0; i < max; i++) {
						if(callbacks[i].cb) {
							var sc = callbacks[i].scope;
							var cb = callbacks[i].cb;
							var fcb = callbacks[i].fcb;
							var d = callbacks[i].data;
							if(typeof cb == "string"){
								// get a function object
								cb = sc[cb];
							}
							if(typeof fcb == "string"){
								// get a function object
								fcb = sc[fcb];
							}
							if((!fcb) || 
							   (fcb.call(sc, name, msg, d))) {
								cb.call(sc, name, msg, d);
							}
						}
					}
				}
			}
		}
			
		h._unsubscribe = function(tree, path, index, sid) {
			if(typeof tree != "undefined") {
				if(index < path.length) {
					var childNode = tree.c[path[index]];
					this._unsubscribe(childNode, path, index + 1, sid);
					if(childNode.s.length == 0) {
						for(var x in childNode.c) 
					 		return;		
						delete tree.c[path[index]];	
					}
					return;
				}
				else {
					var callbacks = tree.s;
					var max = callbacks.length;
					for(var i = 0; i < max; i++) 
						if(sid == callbacks[i].sid) {
							if(this._pubDepth > 0) {
								callbacks[i].cb = null;	
								this._cleanup.push(callbacks[i]);						
							}
							else
								callbacks.splice(i, 1);
							return; 	
						}
				}
			}
		}
		// The following function is provided for automatic testing purposes.
		// It is not expected to be deployed in run-time OpenAjax Hub implementations.
		h.reinit = function()
		{
			for (var lib in OpenAjax.hub.libraries) {
				delete OpenAjax.hub.libraries[lib];
			}
			OpenAjax.hub.registerLibrary("OpenAjax", "http://openajax.org/hub", "1.0", {});

			delete OpenAjax._subscriptions;
			OpenAjax._subscriptions = {c:{},s:[]};
			delete OpenAjax._cleanup;
			OpenAjax._cleanup = [];
			OpenAjax._subIndex = 0;
			OpenAjax._pubDepth = 0;
		}
	};
	// Register the OpenAjax Hub itself as a library.
	OpenAjax.hub.registerLibrary("OpenAjax", "http://openajax.org/hub", "1.0", {});

}
return OpenAjax;
});
//
// Unmanaged OpenAjax Hub implementation of the ListenerInterface.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*jslint white:false, bitwise:true, eqeqeq:true, immed:true, nomen:false, 
  onevar:false, plusplus:false, undef:true, browser:true, devel:true, 
  forin:false, sub:false*/
/*global define*/
define('coweb/listener/UnmanagedHubListener',[
    'coweb/topics',
    'coweb/jsoe/OperationEngine',
    'org/OpenAjax'
], function(topics, OperationEngine, OpenAjax) {    
    // purge interval constants
    var SYNC_INTERVAL = 10000;
    var PURGE_INTERVAL = 10000;
    
    /**
     * @constructor
     */
    var UnmanagedHubListener = function() {
        // make sure we don't listen to our own messages
        this._mutex = false;
        // operation engine
        this._engine = null;
        // should purge if we've received a sync
        this._shouldPurge = false;
        // should sync if we've received a sync and have been quiet
        this._shouldSync = false;

        // Boolean flag which represents whether or not we are currently paused,
        // and therefore buffering incoming events.
        this._paused = false;
        // This array serves as a buffer for all incoming operations for when we
        // are paused.
        this._incomingPausedBuffer = [];

        // timer references
        this._syncTimer = null;
        this._purgeTimer = null;

        // reference to the listener bridge
        this._bridge = null;
        // whether collaborative messages should be sent or not
        this._collab = false;
        // hub connections
        this._conns = [];
    };
    // save the finger joints
    var proto = UnmanagedHubListener.prototype;

    /**
     * Starts listening for cooperative events on the OpenAjax Hub to forward
     * to the session.
     *
     * @param {Object} bridge Session interface for the listener
     * @param {Object} prepResponse Prepare response from the coweb server
     */
    proto.start = function(bridge, prepResponse) {
        this._bridge = bridge;
        this._subscribeHub(prepResponse.collab);
        
        // set op engine timers as heartbeat, but only if collaborative
        if(prepResponse.collab) {
            // clear old timers
            if(this._syncTimer) {clearInterval(this._syncTimer);}
            if(this._purgeTimer) {clearInterval(this._purgeTimer);}
            // start async callbacks for purge and sync checks
            var self = this;
            this._syncTimer = setInterval(function() {
              self._engineSyncOutbound();      
            }, SYNC_INTERVAL);
            this._purgeTimer = setInterval(function() {
                self._onPurgeEngine();
            }, PURGE_INTERVAL);
        }
        
        // notify ready for coweb events
        var roster = this._bridge.getInitialRoster();
        var value = {
            username : prepResponse.username,
            site : this._engine.siteId,
            roster : roster
        };
        OpenAjax.hub.publish(topics.READY, value);
    };

    /**
     * Stops listening for cooperative events on the OpenAjax Hub to forward
     * to the session. Sends notification that the app is leaving the session.
     *
     * @param {Boolean} isDisconnected True if already disconnected from the
     * session or false if still connected
     */
    proto.stop = function(isDisconnected) {
        if(this._bridge) {
            // broadcast a final hub event indicating the client is now leaving
            // the conference if it was ever fully joined to the conference
            try {
                var value = {connected : !isDisconnected};
                OpenAjax.hub.publish(topics.END, value);
            } catch(e) {
                console.warn('UnmanagedHubListener: failed end session notice ' +
                    e.message);
            }
        }
        this._bridge = null;
        if(this._syncTimer) {
            clearInterval(this._syncTimer);
            this._syncTimer = null;
        }
        if(this._purgeTimer) {
            clearInterval(this._purgeTimer);
            this._purgeTimer = null;
        }
        this._unsubscribeHub();
    };

    /**
     * Called by the init method to subscribe to service bot, state, and sync
     * topics. Only subscribes to state and sync topics if collab is true.
     * 
     * @private
     * @param {Boolean} collab True to enable state and sync topics, false to 
     * listen to service events only
     */
    proto._subscribeHub = function(collab) {
        var conn;
        if(collab) {
            // listen for all incremental sync messages
            conn = OpenAjax.hub.subscribe(topics.SYNC+"**",
                '_syncOutbound', this);
            this._conns.push(conn);
            // listen for all full state reply messages
            conn = OpenAjax.hub.subscribe(topics.SET_STATE+"**",
                '_stateOutbound', this);
            this._conns.push(conn);
        }
        // listen for all subscription requests
        conn = OpenAjax.hub.subscribe(topics.SUB_SERVICE+"**",
            '_onSubServiceOutbound', this);
        this._conns.push(conn);
        // listen for all subscription cancelations
        conn = OpenAjax.hub.subscribe(topics.UNSUB_SERVICE+"**",
            '_onUnsubServiceOutbound', this);
        this._conns.push(conn);
        // listen for all get requests
        conn = OpenAjax.hub.subscribe(topics.GET_SERVICE+"**",
            '_onRequestServiceOutbound', this);
        this._conns.push(conn);
        // listen for all topic pausing requests
        conn = OpenAjax.hub.subscribe(topics.PAUSE_TOPIC,
            '_pause', this);
        this._conns.push(conn);
        // listen for all topic resuming requests
        conn = OpenAjax.hub.subscribe(topics.RESUME_TOPIC,
            '_resume', this);
        this._conns.push(conn);
    };

    /**
     * Unsubscribe this listener from all Hub topics.
     *
     * @private
     */
    proto._unsubscribeHub = function() {
        for(var i=0, l=this._conns.length; i < l; i++) {
            OpenAjax.hub.unsubscribe(this._conns[i]);
        }
        this._conns = [];
    };

    /**
     * Called by the session to set the unique ID for this site in the active 
     * session. Used to initialize the op engine.
     *
     * @param {Number} id Unique integer ID for this site in the session
     */
    proto.setSiteID = function(id) {
        //console.debug('UnmanagedHubListener.setSiteID', id);
        this._engine = new OperationEngine(id);
        // siteid 0 is reserved, we duplicate the local site's cv in that slot
        this._engine.freezeSite(0);
    };

    /**
     * Called by the session when a coweb event is received from a remote app.
     * Processes the data in the local operation engine if required before 
     * publishing it on the local Hub. 
     *
     * @param {String} topic Topic name (topics.SYNC.**)
     * @param {String} value JSON-encoded operation value
     * @param {String|null} type Operation type
     * @param {Number} position Operation linear position
     * @param {Number} site Unique integer ID of the sending site
     * @param {Number[]} sites Context vector as an array of integers
     */
    proto.syncInbound = function(topic, value, type, position, site, sites, order) {
        var op, event;
        // console.debug('UnmanagedHubListener.syncInbound topic: %s, value: %s, type: %s, position: %s, site: %d, sites: %s', 
        //     topic, value, type || 'null', position, site, sites ? sites.toString() : 'null');
        if(this._paused && (type !== null)) {
            this._incomingPausedBuffer.push([topic, value, type, position,
                                             site, sites, order]);
            return;
        }

        // check if the event has a context and non-null type
        if(sites && type) {
            // treat event as a possibly conflicting operation
            try {
                op = this._engine.push(false, topic, value, type, position, 
                    site, sites, order);
            } catch(e) {
                console.log('topic ',topic);
                console.log('value ',position);
                console.log('type ',position);
                console.log('position ',position);
                console.warn('UnmanagedHubListener: failed to push op into engine ' +
                    e.message);
                // @todo: we're out of sync now probably, fail the session?
                return;
            }
            // discard null operations; they should not be sent to app
            // according to op engine
            if(op === null) {return;}
            // use newly computed value and position
            value = op.value;
            position = op.position;
        } else if(site === this._engine.siteId) {
            // op was echo'ed from server for op engine, but type null means
            // op engine doesn't care about this message anyway so drop it
            return;
        }

        // value is always json-encoded to avoid ref sharing problems with ops
        // stored inside the op engine history buffer, so decode it and
        // pack it into a hub event
        event = {
            position : position,
            type : type,
            value : JSON.parse(value),
            site : site
        };

        // publish on local hub
        this._mutex = true;
        try {
            OpenAjax.hub.publish(topic, event);
        } catch(z) {
            console.warn('UnmanagedHubListener: failed to deliver incoming event ' + 
                topic + '(' + z.message + ')');
        }
        this._mutex = false;

        if(op) {
            // we've gotten an operation from elsewhere, so we should sync 
            // and/or purge the engine on the next interval
            this._shouldPurge = true;
            this._shouldSync = true;
        }
    };

    /**
     * Called when an CollabInterface publishes a cooperative event on the 
     * local Hub. Processes the data in the local operation engine if required 
     * before forwarding it to the session.
     * 
     * @private
     * @param {String} topic Topic name (topics.SYNC.**)
     * @param {Object} event Cooperative event to send
     */
    proto._syncOutbound = function(topic, event) {
        // if the mutex is held, we're broadcasting and shouldn't be 
        // getting any additional events back, EVER!
        // (all other events will be generated by the same broadcast 
        // at other locations so we NEVER have to ship them)
        // assumes synchronous hub operation
        // stop now if we have no engine
        if(this._mutex || !this._engine) {
            return;
        }

        // unpack event data; be sure to json encode the value before pushing
        // into op engine to avoid ref sharing with the operation history
        var position = event.position,
            type = event.type,
            value = JSON.stringify(event.value),
            op = null,
            sites = null,
            msg,
            sent,
            err;

        if(type !== null) {   
            // build operation
            try {
                op = this._engine.createOp(true, topic, value, type, position);
                sites = op.contextVector.sites;
            } catch(e) {
                console.warn('UnmanagedHubListener: bad type "' + type +
                    '" on outgoing event; making null');
                type = null;
            }   
        }

        // console.debug('UnmanagedHubListener._syncOutbound topic: %s, value: %s, type: %s, position: %s, sites: %s', 
        // topic, value, type || 'null', position, sites ? sites.toString() : 'null');
        
        // post to client
        try {
            sent = this._bridge.postSync(topic, value, type, position, sites);
        } catch(x) {
            // ignore if can't post
            err = x;
            sent = false;
            console.warn('UnmanagedHubListener: failed to send hub event ' + 
                x.message);
        }
        if(sent && type !== null) {
            // add local event to engine, but only if it was really sent
            // yes, the local state changed, but it's better to keep the
            // context vector in the engine consistent than to track an
            // event we never sent
            this._engine.pushLocalOp(op);
            // we have to allow purges after sending even one event in 
            // case this site is the only one in the session for now
            this._shouldPurge = true;
        } else if(err) {
            // throw error back to the caller
            throw err;
        }
    };
    
    /**
     * Called by the session when a roster notice arrives. Converts the notice 
     * to a Hub event and broadcasts it on the local Hub. Updates the sites
     * tracked by the op engine.
     *
     * @param {String} type 'available', 'unavailable'
     * @param {Number} roster.site Integer site ID affected
     * @param {String} roster.username Authenticated username at the site
     */
    proto.noticeInbound = function(type, roster) {
        var topic, event = {};

        // build event object
        event.site = roster.siteId;
        event.username = roster.username;
        if(type === 'available') {
            // joining user
            topic = topics.SITE_JOIN;
            // thaw the slot in the engine so the new site's cv is tracked
            //   properly
            try {
                this._engine.thawSite(event.site);
            } catch(e) {
                console.warn('UnmanagedHubListener: failed to thaw site ' + 
                    event.site + ' ' + e.message);
                // @todo: op engine died, exit session?
            }
        } else if(type === 'unavailable') {
            // leaving user
            topic = topics.SITE_LEAVE;
            // freeze the slot in the engine so garbage collection can continue
            //   unabated now that the site is gone
            try {
                this._engine.freezeSite(event.site);
            } catch(x) {
                console.warn('UnmanagedHubListener: failed to freeze site ' + 
                    event.site + ' ' + x.message);
                // @todo: op engine died, exit session?
            }
        }

        // publish on local hub
        this._mutex = true;
        try {
            OpenAjax.hub.publish(topic, event);
        } catch(z) {
            console.warn('UnmanagedHubListener: failed to deliver notice ' + 
                z.message);
        }
        this._mutex = false;
    };
    
    /**
     * Called by the session when a service publish arrives. Packages the 
     * response into a Hub event and publishes it locally (topics.SET_SERVICE).
     *
     * @param {String} serviceName Name of the service that published
     * @param {Object|String} value Arbitrary value published or error string
     * @param {Boolean} error True if value represents an error, false if data
     */
    proto.servicePublishInbound = function(serviceName, value, error) {
        var topic = topics.SET_SERVICE+serviceName,
            event = {
                value : value,
                error : error
            };
        try {
            OpenAjax.hub.publish(topic, event);
        } catch(e) {
            console.warn('UnmanagedHubListener: failed to deliver bot publish ' + 
                e.message);
        }
    };

    /**
     * Called by the session when a service response arrives. Packages the
     * response into a Hub event and publishes it locally.
     * 
     * @param {String} topic Topic name included in the request 
     * (topics.SET_SERVICE.**)
     * @param {Object|String} value Arbitrary value published or error string
     * @param {Boolean} error True if value represents an error, false if data
     */
    proto.serviceResponseInbound = function(topic, value, error) {
        // pack value and flag into a hub event
        var event = {
            value : value,
            error : error
        };
        try {
            OpenAjax.hub.publish(topic, event);
        } catch(e) {
            console.warn('UnmanagedHubListener: failed to deliver bot response ' + 
                e.message);
        }
    };

    /**
     * Called when a CollabInterface instance subscribes to a service.
     * Forwards the request to the session.
     * 
     * @private
     * @param {String} topic Topic name (topics.SUB_SERVICE.**)
     * @param {Object} evebt Object topic value
     */
    proto._onSubServiceOutbound = function(topic, event) {
        try {
            this._bridge.postServiceSubscribe(event.service);
        } catch(e) {
            console.warn('UnmanagedHubListener: failed service subscribe ' + 
                e.message);
        }    
    };


    /**
     * Called when a CollabInterface instance unsubscribes from a service.
     * Forwards the request to the session.
     * 
     * @private
     * @param {String} topic Topic name (topics.UNSUB_SERVICE.**)
     * @param {Object} event Object topic value
     */
    proto._onUnsubServiceOutbound = function(topic, event) {
        try {
            this._bridge.postServiceUnsubscribe(event.service);
        } catch(e) {
            console.warn('UnmanagedHubListener: failed service unsub ' + 
                e.message);
        }
    };

    /**
     * Called when a CollabInterface instance posts a request to a service.
     * Forwards the request to the session.
     * 
     * @private
     * @param {String} topic Topic name (topics.GET_SERVICE.**)
     * @param {Object} event Object topic value
     */
    proto._onRequestServiceOutbound = function(topic, event) {
        try {
            this._bridge.postServiceRequest(event.service,
                event.params, event.topic);
        } catch(e) {
            console.warn('UnmanagedHubListener: failed service request ' + 
                e.message);
        }
    };

    /**
     * Called by the session to retrieve the full state of the local 
     * application to seed a new app instance joining the session. Broadcasts
     * a request for state on the local Hub (topics.GET_STATE) and collects 
     * state directly from the op engine (topics.ENGINE_STATE). Sends an 
     * end state (null) sentinel after publishing all requests as 
     * this impl of the Hub is synchronous.
     *
     * @param {String} recipient Token that all responses with application 
     * state must include to pair with the original request
     */
    proto.requestStateInbound = function(recipient) {
        // ask all gadgets for their state
        try {
            OpenAjax.hub.publish(topics.GET_STATE, recipient);
        } catch(e) {
            // @todo: really want to send error back to requester that this
            // site can't send state; for now, just log error and continue
            console.warn('UnmanagedHubListener: failed collecting state ' + 
                e.message);
        }

        // NOTE: continuing here only works because we're synchronous...
        // purge the operation engine to shrink the data sent
        var state;
        try {
            this._engine.purge();
            // get the state of the operation engine
            state = this._engine.getState();
        } catch(x) {
            // @todo: really want to send error back to requester that this
            // site can't send state; for now, just log error and continue
            console.warn('UnmanagedHubListener: failed collecting engine state ' + 
                x.message);
        }

        try {
            // post engine state
            this._bridge.postStateResponse(topics.ENGINE_STATE, state, 
                recipient);
        } catch(y) {
            // ignore if can't post
            console.warn('UnmanagedHubListener: failed sending engine state ' + 
                y.message);
        }
        
        try {
            console.log(this._incomingPausedBuffer);
            // post pause queue state
            this._bridge.postStateResponse(topics.PAUSE_STATE, this._incomingPausedBuffer, 
                recipient);
        } catch(w) {
            // ignore if can't post
            console.warn('UnmanagedHubListener: failed sending pause state ' + 
                w.message);
        }

        try {
            // indicate done collecting state
            this._bridge.postStateResponse(null, null, recipient);
        } catch(z) {
            // ignore if can't post
            console.warn('UnmanagedHubListener: failed sending end state ' + 
                z.message);
        }
    };

    /**
     * Called when a CollabInterface instance responds with a portion of the
     * current application state. Forwards the state to the session.
     *
     * @private
     * @param {String} topic Topic name (topics.SET_STATE)
     * @param {Object} event.state Arbitrary app state
     * @param {Object} event.token Token from the state request
     */
    proto._stateOutbound = function(topic, event) {
        //console.debug('UnmanagedHubListener._onState', topic);
        // don't listen to state we just sent
        if(this._mutex) {
            return;
        }

        // pull out data to send
        var recipient = event.recipient;
        var msg = event.state;
        
        // send message to client here
        try {
            // topic is always SET_STATE so state is applied at receiver
            // value is state JSON blob
            // type and position are unused, so just set them to defaults
            // recipient is whatever the client gave us initially
            this._bridge.postStateResponse(topic, msg, recipient);
        } catch(e) {
            // ignore if can't post
            console.warn('UnmanagedHubListener: failed to send state ' + 
                e.message);
        }
    };

    /**
     * Called by the session to foward state received from a remote application
     * instance to initialize the local app. Broadcasts received app state on
     * the local Hub and passes op engine state directly to the local instance.
     *
     * @param {String} topic Topic name (topics.ENGINE_STATE, topics.SET_STATE)
     * @param {Object} state Arbitrary state
     */
    proto.stateInbound = function(topic, state) {
        if(topic === topics.PAUSE_STATE) {
            // handle pause queue state
            try {
                for(var i=0; i<state.length; i++){
                    this.syncInbound(state[i][0],state[i][1],state[i][2],state[i][3],state[i][4],state[i][5],state[i][6]);
                }
            } catch(a) {
                console.warn('UnmanagedHubListener: failed to recv pause queue state ' + 
                    a.message);
                throw a;
            }
        //console.debug('UnmanagedHubListener.broadcastState', topic);
        }else if(topic === topics.ENGINE_STATE) {
            // handle engine state
            try {
                this._engine.setState(state);
            } catch(e) {
                console.warn('UnmanagedHubListener: failed to recv engine state ' + 
                    e.message);
                // @todo: engine dead, should exit session
                throw e;
            }
        } else {
            // handle gadget state
            // lock mutex so we don't publish anything after setting state
            this._mutex = true;
            try {
                // publish state for a gadget to grab
                OpenAjax.hub.publish(topic, state);
            } catch(x) {
                console.warn('UnmanagedHubListener: failed to recv state ' + 
                    x.message);
                throw x;
            } finally {
                this._mutex = false;
            }
        }
    };

    /**
     * Called on a timer to send the local op engine context vector to other
     * participants (topics.ENGINE_SYNC) if the local op engine processed
     * received events since since the last time the timer fired.
     */
    proto._engineSyncOutbound = function() {
        if(!this._engine || !this._shouldSync) {return;}
        // console.debug('UnmanagedHubListener._engineSyncOutbound');
        // get engine context vector
        var cv = this._engine.copyContextVector();
        try {
            this._bridge.postEngineSync(cv.sites);
        } catch(e) {
            // ignore if can't post
            console.warn('UnmanagedHubListener: failed to send engine sync ' + 
                e.message);
            return;
        }
        this._shouldSync = false;
    };
    
    /**
     * Called when the listener receives a context vector from a remote op
     * engine (topics.ENGINE_SYNC). Integrates the context vector into context
     * vector table of the local engine. Sets a flag saying the local op engine
     * should run garbage collection over its history. 
     */
    proto.engineSyncInbound = function(site, sites) {
        // ignore our own engine syncs
        if(site === this._engine.siteId) {return;}
        // give the engine the data
        try {
            this._engine.pushSyncWithSites(site, sites);
        } catch(e) {
            console.warn('UnmanagedHubListener: failed to recv engine sync ' + 
                site + ' ' + sites + ' ' + e.message);
        }
        // we've received remote info, allow purge
        this._shouldPurge = true;
    };

    /**
     * Called on a timer to purge the local op engine history buffer if the
     * op engine received a remote event or context vector since the last time
     * the timer fired.
     */
    proto._onPurgeEngine = function() {
        if(!this._engine) {return;}
        var size;
        if(this._shouldPurge) {
            size = this._engine.getBufferSize();
            // var time = new Date();
            try {
                var mcv = this._engine.purge();
            } catch(e) {
                console.warn('UnmanagedHubListener: failed to purge engine ' +
                    e.message);
            }
            // time = new Date() - time;
            // size = this._engine.getBufferSize();
            // console.debug('UnmanagedHubListener: purged size =',
            //     size, 'time =', time, 'mcv =',
            //     (mcv != null) ? mcv.toString() : 'null');
        }
        // reset flag
        this._shouldPurge = false;
        return size;
    };

    /**
     * Returns true if the given topic is currently paused.
     *
     * @private
     * @param {String} topic The topic to test if it is currently paused or not.
     */
    proto._topicIsPaused = function(topic) {
        return topic in this._pausedTopics;
    };

    /**
     * Pause incoming operations from being applied. Puts all operations in a
     * buffer to be applied later when we resume.
     *
     * @private
     */
    proto._pause = function() {
        if(!this._paused) {
            this._paused = true;
            this._incomingPausedBuffer = [];
        }
    };

    /**
     * Resume syncing operations and apply the incoming operations that have
     * been buffered while we were paused.
     *
     * @private
     */
    proto._resume = function() {
        var i, len;
        if(this._paused) {
            this._paused = false;
            for(i = 0, len = this._incomingPausedBuffer.length; i < len; i++) {
                this.syncInbound.apply(this, this._incomingPausedBuffer[i]);
            }
        }
    };

    return UnmanagedHubListener;
});//
// Unmanaged OpenAjax Hub implementation of the CollabInterface.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*jslint white:false, bitwise:true, eqeqeq:true, immed:true, nomen:false, 
  onevar:false, plusplus:false, undef:true, browser:true, devel:true, 
  forin:false, sub:false*/
/*global define*/
define('coweb/collab/UnmanagedHubCollab',[
    'coweb/topics',
    'coweb/util/Promise',
    'org/OpenAjax'
], function(topics, Promise, OpenAjax) {
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
            throw new Error('collab id required');
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
     * Throws an exception if this instance is not initialized.
     *
     * @param {String} name Cooperative event name
     * @param {Object} value JSON-encodable value for the change
     * @param {String|null} [type='update'] Type of change or null
     * @param {Number} [position=0] Integer position of the change
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
     * Throws an exception if this instance is not initialized.
     *
     * @param {Object} state JSON-encodable state data for the response
     * @param {String} token Opaque token from the original state request
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
     * @param {Object|Function} context Context in which to invoke the callback
     * or the callback itself
     * @param {Function|String} callback Function to invoke if context
     * specified
     * @returns {Promise} Always notifies success because this impl is
     * synchronous
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
