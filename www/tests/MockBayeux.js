//
// Mock Bayeux server for testing.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
dojo.provide('tests.MockBayeux');
dojo.require('tests.MockXhr');

dojo.declare('tests.MockBayeux', tests.MockXhr.MockServer, {
    bayeuxUrl : '/cometd',
    constructor: function(args) {
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
    },

    onRequest: function(server, req, respDef) {
        var ioArgs = req.ioArgs;
        var meth = null;
        if(!ioArgs.args.postData) {
            throw new Error(500);
        }
        var msgs = dojo.fromJson(ioArgs.args.postData);
        dojo.forEach(msgs, function(msg) {
            var meth = msg.channel.replace(/\//g, '_');
            if(!this[meth]) {
                this._publish(server, msg, respDef);
            } else {
                this[meth](server, msg, respDef);
            }
        }, this);
        if(this._needLpFlush) {
            this._flushLpQueue();
        }
        if(respDef != this._lp) {
            this._flushTmpQueue(respDef);
        }
    },
    
    respond: function(resp) {
        if(resp.channel.search('/meta') === 0) {
            // console.log('* queueing tmp', resp);
            this._tmpQueue.push(resp);
        } else {
            // console.log('* queueing lp', resp);
            this._needLpFlush = true;
            this._lpQueue.push(resp);
        }
    },
    
    _flushTmpQueue: function(respDef) {
        setTimeout(dojo.hitch(this, function() {
            var q = this._tmpQueue;
            this._tmpQueue = [];
            respDef.callback(q);            
        }), 0);
    },

    _flushLpQueue: function() {
        if(this._lp) {
            this._needLpFlush = false;
            this._firstLp = false;
            setTimeout(dojo.hitch(this, function() {
                var q = this._lpQueue;
                var lp = this._lp;
                this._lpQueue = [];
                this._lp = null;
                lp.callback([this.connectResp].concat(q));
            }), 0);
        }
    },

    _meta_handshake: function(server, msg, respDef) {
        var resp = dojo.clone(this.handshakeResp);
        this.respond(resp);
        this.onMetaHandshake(server, msg, resp);
    },
    
    onMetaHandshake: function() {},

    _meta_connect: function(server, msg, respDef) {
        this.connectResp.id = msg.id;
        this._lp = respDef;
        if(this._firstLp) {
            this._needLpFlush = true;
        }
        this.onMetaConnect(server, msg);
    },
    
    onMetaConnect: function() {},
    
    _meta_disconnect: function(server, msg, respDef) {
        var resp = dojo.clone(this.disconnectResponse);
        resp.id = msg.id;
        this.respond(resp);
        this.onMetaDisconnect(server, msg);
    },
    
    onMetaDisconnect: function() {},

    _meta_subscribe: function(server, msg, respDef) {
        var resp = dojo.clone(this.subscribeResponse);
        resp.id = msg.id;
        resp.subscription = msg.subscription;
        this.respond(resp);
        this.onMetaSubscribe(server, msg, resp);
    },
    
    onMetaSubscribe: function() {},
    
    _meta_unsubscribe: function(server, msg, respDef) {
        var resp = dojo.clone(this.unsubscribeResponse);
        resp.id = msg.id;
        resp.subscription = msg.subscription;
        this.respond(resp);
        this.onMetaUnsubscribe(server, msg, resp);
    },
    
    onMetaUnsubscribe: function() {},
    
    _publish : function(server, msg, respDef) {
        var resp = dojo.clone(this.publishResponse);
        resp.id = msg.id;
        resp.channel = msg.channel;
        this.respond(resp);
        this.onPublish(server, msg, resp);
    },
    
    onPublish: function() {}
});