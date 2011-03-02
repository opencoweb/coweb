//
// Lightweight promises implementation loosely based on 
// http://wiki.commonjs.org/wiki/Promises/A and the dojo.Deferred 
// implementation.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
//
/*global define*/
define(function() {
    var Promise = function() {
        // immutable properties
        var currListener, lastListener, result, errored, fulfilled;
        
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
                        if(console && console.error) {
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

        this.resolve = function(value) {
            if(fulfilled) {
                throw new Error('promise already resolved');
            }
            fulfilled = true;
            result = value;
            return notifyListeners();
        };

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
});