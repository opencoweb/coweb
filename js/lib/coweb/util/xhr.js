//
// Simple XHR for browser environments.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
//
/*global define window*/
define(['coweb/util/Promise'], function(Promise) {
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
         * Do an XHR request. The function extends the passed args with:
         * - xhr: The browser XMLHttpRequest object
         *
         * @param {Object} args Args for the XHR
         * - url: Target url
         * - sync: True to send synchronously (default: false)
         * - method: POST, GET, etc.
         * - body: Body of the request
         * - headers: Key/value HTTP headers
         * @return Promise to resolve or fail on XHR completion with the 
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
});