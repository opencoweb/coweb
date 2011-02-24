//
// Mock XHR for testing.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
define([
    'coweb/util/xhr',
    'coweb/util/Promise'
], function(xhr, Promise) {
    return {
        _hooked : null,
        _servers : {},
        addServer: function(url, inst) {
            var x = this._servers[url];
            if(x) {
                throw new Error('server already registered at ' + url);
            }
            this._servers[url] = inst;
        },
    
        removeServer: function() {
            var x = this._servers[url];
            if(!x) {
                throw new Error('server not registered at ' + url);
            }
            delete this._servers[url];
        },
    
        clearServers: function() {
            this._servers = {};
        },

        send: function(args) {
            var promise = new Promise();
            // standard dojo ioargs structure
            var ioArgs = {
                args : args,
                url : args.url,
                xhr : {
                    status : 0,
                    statusText : 'simulated status response',
                    responseText : 'simulated status response'
                }
            };
            promise.ioArgs = ioArgs;
            promise.xhr = ioArgs.xhr;
            // send to server instance
            this._sendToServer(promise);
            return promise;
        },

        _sendToServer: function(req) {
            var server = this._servers[req.ioArgs.url];
            if(server) {
                server.queue(req);
            } else {
                console.warn('no server registered for', req.ioArgs.url);
            }
        },    
    
        hook: function() {
            if(this._hooked) {
                throw new Error('already hooked coweb/util/xhr');
            }
            this._hooked = xhr.send;
            var self = this;
            xhr.send = function() {
                self.send.apply(self, arguments);
            };
        },
    
        unhook: function() {
            if(!this._hooked) {
                throw new Error('coweb/util/xhr not hooked');
            }
            xhr.send = this._hooked;
            this._hooked = null;
        },

        abort: function() {
            // @todo: 
            console.warn('aborting mock xhr');
        }
    };
});