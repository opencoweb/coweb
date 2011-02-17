//
// Binding for CometD that uses pure browser features, no toolkits.
// Assumes org.cometd loaded independently. 
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
define([
    'coweb/util/xhr'
], function() {
    // @todo: nicer error if undefined in browser
    // use browser native functions, http://caniuse.com/#search=JSON
    org.cometd.JSON.toJSON = JSON.stringify;
    org.cometd.JSON.fromJSON = JSON.parse;
    
    // build default instance
    var cometd = new org.cometd.Cometd();

    // implement abstract methods in required transports
    var LongPollingTransport = function() {
        var _super = new org.cometd.LongPollingTransport();
        var that = org.cometd.Transport.derive(_super);
        // implement abstract method
        that.xhrSend = function(packet) {
            packet.method = 'POST';
            packet.headers = packet.headers || {};
            packet.headers['Content-Type'] = 'application/json;charset=UTF-8';
            return xhr.send(packet);
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