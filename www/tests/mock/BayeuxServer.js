//
// Mock Bayeux server for testing.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
define([
    'mock/Server',
    'coweb/util/lang'
], function(Server, lang) {
    var BayeuxServer = function() {
        // invoke base class constructor
        Server.call(this);

        this.bayeuxUrl = '/cometd';
        this.handshakeResp = {
            channel: "/meta/handshake",
            version: "1.0",
            supportedConnectionTypes: ["long-polling"],
            clientId: "123456",
            successful: true,
            ext : {
                ack : true
            }
        };
        this.connectResp = {
            channel : '/meta/connect',
            id : null,
            successful: true,
            advice: { 
                timeout: 15000
            }
        };
        this.subscribeResponse = {
            channel : '/meta/subscribe',
            id : null,
            successful : true,
            subscription : null,
            advice: { 
                timeout: 15000
            }
        };
        this.unsubscribeResponse = {
            channel : '/meta/unsubscribe',
            id : null,
            successful : true,
            subscription : null,
            advice: { 
                timeout: 15000
            }
        };
        this.publishResponse = {
            channel : null,
            id : null,
            successful : true,
            advice: { 
                timeout: 15000
            }
        };
        this.disconnectResponse = {
            channel : '/meta/disconnect',
            id : null,
            successful : true
        };
        this.publishEnvelope = {
            channel : null,
            data : null
        };
        this._firstLp = true;
        this._lp = null;
        this._lpQueue = []; 
        this._tmpQueue = [];
        this._needLpFlush = false;
    };
    BayeuxServer.prototype = new Server();
    BayeuxServer.prototype.constructor = BayeuxServer;
    var proto = BayeuxServer.prototype;

    proto.onRequest = function(server, req, resp) {
        var meth = null;
        if(!req.args.body) {
            throw new Error(500);
        }
        var msgs = lang.clone(req.args.body);
        for(var i=0, l=msgs.length; i<l; i++) {
            var msg = msgs[i];
            var meth = msg.channel.replace(/\//g, '_');
            if(!this[meth]) {
                this._publish(server, msg, resp);
            } else {
                this[meth](server, msg, resp);
            }
        }
        if(this._needLpFlush) {
            this._flushLpQueue();
        }
        if(resp != this._lp) {
            this._flushTmpQueue(resp);
        }
    };
    
    proto.respond = function(msg) {
        if(msg.channel.search('/meta') === 0) {
            // console.log('* queueing tmp', msg);
            this._tmpQueue.push(msg);
        } else {
            // console.log('* queueing lp', msg);
            this._needLpFlush = true;
            this._lpQueue.push(msg);
        }
    };
    
    proto._flushTmpQueue = function(resp) {
        var self = this;
        setTimeout(function() {
            var q = self._tmpQueue;
            self._tmpQueue = [];
            resp.resolve(q);            
        }, 0);
    };

    proto._flushLpQueue = function() {
        if(this._lp) {
            this._needLpFlush = false;
            this._firstLp = false;
            var self = this;
            setTimeout(function() {
                var q = self._lpQueue;
                var lp = self._lp;
                self._lpQueue = [];
                self._lp = null;
                lp.resolve([self.connectResp].concat(q));
            }, 0);
        }
    };

    proto._meta_handshake = function(server, msg, resp) {
        var val = lang.clone(this.handshakeResp);
        this.respond(val);
        this.onMetaHandshake(server, msg, val);
    };
    
    proto.onMetaHandshake = function() {};

    proto._meta_connect = function(server, msg, resp) {
        this.connectResp.id = msg.id;
        this._lp = resp;
        if(this._firstLp) {
            this._needLpFlush = true;
        }
        this.onMetaConnect(server, msg);
    };
    
    proto.onMetaConnect = function() {};
    
    proto._meta_disconnect = function(server, msg, resp) {
        var val = lang.clone(this.disconnectResponse);
        val.id = msg.id;
        this.respond(val);
        this.onMetaDisconnect(server, msg);
    };
    
    proto.onMetaDisconnect = function() {};

    proto._meta_subscribe = function(server, msg, resp) {
        var val = lang.clone(this.subscribeResponse);
        val.id = msg.id;
        val.subscription = msg.subscription;
        this.respond(val);
        this.onMetaSubscribe(server, msg, val);
    };
    
    proto.onMetaSubscribe = function() {};
    
    proto._meta_unsubscribe = function(server, msg, resp) {
        var val = lang.clone(this.unsubscribeResponse);
        val.id = msg.id;
        val.subscription = msg.subscription;
        this.respond(val);
        this.onMetaUnsubscribe(server, msg, val);
    };
    
    proto.onMetaUnsubscribe = function() {};
    
    proto._publish = function(server, msg, resp) {
        var val = lang.clone(this.publishResponse);
        val.id = msg.id;
        val.channel = msg.channel;
        this.respond(val);
        this.onPublish(server, msg, val);
    };
    
    proto.onPublish = function() {};
    
    return BayeuxServer;
});