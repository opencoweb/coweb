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
        send: function(packet) {
            // build xhr object
            var xhr = new window.XMLHttpRequest();
            // attach to read state change
            xhr.onreadystatechange = function(e) {
                // get event and state state
                e = e || window.event;
                var rs = xhr.readyState;
                // check if complete
                if(rs === 4) {
                    // protect against dupe calls
                    xhr.onreadystatechange = function() {};
                    // check status
                    var stat = xhr.status || 0;
                    if((stat >= 200 && stat < 300) || 
                        // success is any 200 or a 304 from cache or an IE 1223
                        stat === 304 || stat === 1223) {
                        packet.onSuccess(xhr.responseText);
                    } else {
                        // error on everything else
                        var err = new Error("failed loading "+packet.url+" status:"+xhr.status);
                        packet.onError(xhr.statusText, err);
                    }
                }
            };
            // do all ops in try/catch to report all errors
            try {
                xhr.open(packet.method, packet.url, packet.sync !== true);
                _setHeaders(xhr, packet.headers);
                xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
                xhr.send(packet.body);
            } catch(e) {
                packet.onError('failed sending xhr to '+packet.url, e);
            }
            return xhr;
        }
    };
});