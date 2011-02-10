//
// Binding for CometD that uses pure browser features, no toolkits.
// Assumes org.cometd loaded independently. 
//
// @todo: factor xhr code out into util for reuse in prep, login, logout
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
define(function() {
    // @todo: nicer error if undefined in browser
    // use browser native functions, http://caniuse.com/#search=JSON
    org.cometd.JSON.toJSON = JSON.stringify;
    org.cometd.JSON.fromJSON = JSON.parse;
    
    // build default instance
    var cometd = new org.cometd.Cometd();

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

    // implement abstract methods in required transports
    var LongPollingTransport = function() {
        var _super = new org.cometd.LongPollingTransport();
        var that = org.cometd.Transport.derive(_super);
        // implement abstract method
        that.xhrSend = function(packet) {
            // build xhr object
            var xhr = new window.XMLHttpRequest();
            // attach to read state change
            xhr.onreadystatechange = function(e) {
                // get event and state state
                e = e || window.event;
                var rs = xhr.readyState || 'none';
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
                xhr.open('POST', packet.url, packet.sync !== true);
                _setHeaders(xhr, packet.headers);
                xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
                xhr.send(packet.body);
            } catch(e) {
                packet.onError('failed sending xhr to '+packet.url, e);
            }
            return xhr;
        };
        return that;
    };

    // register transports
    // @todo: websocket disabled for now
    // if (window.WebSocket) {
    //     cometd.registerTransport('websocket', new org.cometd.WebSocketTransport());
    // }
    cometd.registerTransport('long-polling', new LongPollingTransport());
    
    // register required extension
    cometd.registerExtension('ack', new org.cometd.AckExtension());
    return cometd;
});