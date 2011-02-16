//
// Simple XHR for browser environments.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
//
define(function() {
    var _setHeaders = function(xhr, headers) {
        if(headers) {
            for (var headerName in headers) {
                if(!headers.hasOwnProperty(headerName) ||
                    headerName.toLowerCase() === 'content-type') {
                    continue;
                }
                xhr.setRequestHeader(headerName, headers[headerName]);
            }
        }
    };

    return {
        send: function(args) {
            // build xhr object
            var xhr = new window.XMLHttpRequest();
            // attach to ready state change
            xhr.onreadystatechange = function(event) {
                // get event and ready state
                event = event || window.event;
                var rs = xhr.readyState;
                // check if complete
                if(rs === 4) {
                    // stash xhr object into args before responding
                    args.xhr = xhr;
                    // protect against dupe calls
                    xhr.onreadystatechange = function() {};
                    // check status
                    var stat = xhr.status || 0;
                    if((stat >= 200 && stat < 300) || 
                        // success is any 200 or a 304 from cache or an IE 1223
                        stat === 304 || stat === 1223) {
                        if(args.onSuccess) {
                            args.onSuccess(xhr.responseText, args);
                        }
                    } else {
                        // error on everything else
                        var err = new Error("failed loading "+args.url+" status:"+xhr.status);
                        if(args.onError) {
                            args.onError(err, args);
                        }
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
            return xhr;
        }
    };
});