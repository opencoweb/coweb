//
// Lightweight promises implementation based on 
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
            var func, rv, nextVal, ptr;
            var success = function(val) {
                ptr.promise.resolve(val);
            };
            var failure = function(err) {
                ptr.promise.fail(err);
            };
            while(currListener) {
                ptr = currListener;
                currListener = currListener.next;
                func = (errored) ? ptr.errback : ptr.callback;
                if(func) {
                    // have a registered function for notification
                    try {
                        rv = func(result);
                        if(rv && typeof rv.then === 'function') {
                            // function returned a new promise
                            rv.then(success, failure);
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
                        // some registered function failed
                        ptr.promise.fail(e);
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
        };

        this.then = function(callback, errback) {
            var listener = {
                callback : callback,
                errback : errback,
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
            notifyListeners();
        };

        this.fail = function(err) {
            if(fulfilled) {
                throw new Error('promise already resolved');
            }
            fulfilled = true;
            errored = true;
            result = err;
            notifyListeners();
        };
    };

    return Promise;
});