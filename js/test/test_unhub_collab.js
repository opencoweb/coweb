//
// Tests the UnamangedHubCollab implementation of CollabInterface.
// 
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
//
/*global define module test raises deepEqual ok equal strictEqual*/
define([
    'coweb/collab/UnmanagedHubCollab',
    'org/OpenAjax',
    'coweb/topics'
], function(UnmanagedHubCollab, OpenAjax, topics) {
    module('collab', {
        setup: function() {
            this.collab = new UnmanagedHubCollab();
            this.collab.init({id : 'test'});
            this._subs = [];
        },
        teardown: function() {
            this.collab.unsubscribeAll();
            delete this.collab;
            for(var i=0, l=this._subs.length; i<l; i++) {
                OpenAjax.hub.unsubscribe(this._subs[i]);
            }
        }
    });
    
    test('missing id', 2, function() {
        var collab2 = new UnmanagedHubCollab();
        raises(collab2.init);
        try {
            collab2.init({});
        } catch(e) {
            ok(e);
        }
    });
    
    test('missing init', 5, function() {
        var collab2 = new UnmanagedHubCollab();
        raises(collab2.sendSync);
        raises(collab2.subscribeSync);
        raises(collab2.subscribeStateResponse);
        raises(collab2.sendStateResponse);
        raises(collab2.postService);
    });
    
    test('subscribe ready', 7, function() {
        var target = {a : 'a', b : 'b'},
            cb = function(info) {
                deepEqual(info, target);
            },
            obj = {
                sentinel : 'sentinel',
                cb : function(info) {
                    equal(this.sentinel, 'sentinel');
                    cb(info);
                }
            };
        
        this.collab.subscribeReady(cb);
        this.collab.subscribeReady(obj, obj.cb);
        this.collab.subscribeReady(obj, 'cb');
        raises(this.collab.subscribeReady, 'bad function');
        try {
            this.collab.subscribeReady(obj, 'foo');
        } catch(e) {
            ok(true, 'bad function');
        }
        OpenAjax.hub.publish(topics.READY, target);
    });
    
    test('subscribe end', 7, function() {
        var target = true,
            cb = function(connected) {
                equal(connected, target);
            },
            obj = {
                sentinel : 'sentinel',
                cb : function(connected) {
                    equal(this.sentinel, 'sentinel');
                    cb(connected);
                }
            };
        
        this.collab.subscribeEnd(cb);
        this.collab.subscribeEnd(obj, obj.cb);
        this.collab.subscribeEnd(obj, 'cb');
        raises(this.collab.subscribeEnd, 'bad function');
        try {
            this.collab.subscribeEnd(obj, 'foo');
        } catch(e) {
            ok(true, 'bad function');
        }
        OpenAjax.hub.publish(topics.END, target);
    });
    
    test('subscribe join', 7, function() {
        var target = {a : 'a', b : 'b'},
            cb = function(info) {
                deepEqual(info, target);
            },
            obj = {
                sentinel : 'sentinel',
                cb : function(info) {
                    equal(this.sentinel, 'sentinel');
                    cb(info);
                }
            };
        
        this.collab.subscribeSiteJoin(cb);
        this.collab.subscribeSiteJoin(obj, obj.cb);
        this.collab.subscribeSiteJoin(obj, 'cb');
        raises(this.collab.subscribeSiteJoin, 'bad function');
        try {
            this.collab.subscribeSiteJoin(obj, 'foo');
        } catch(e) {
            ok(true, 'bad function');
        }
        OpenAjax.hub.publish(topics.SITE_JOIN, target);
    });
    
    test('subscribe leave', 7, function() {
        var target = {a : 'a', b : 'b'},
            cb = function(info) {
                deepEqual(info, target);
            },
            obj = {
                sentinel : 'sentinel',
                cb : function(info) {
                    equal(this.sentinel, 'sentinel');
                    cb(info);
                }
            };
        
        this.collab.subscribeSiteLeave(cb);
        this.collab.subscribeSiteLeave(obj, obj.cb);
        this.collab.subscribeSiteLeave(obj, 'cb');
        raises(this.collab.subscribeSiteLeave, 'bad function');
        try {
            this.collab.subscribeSiteLeave(obj, 'foo');
        } catch(e) {
            ok(true, 'bad function');
        }
        OpenAjax.hub.publish(topics.SITE_LEAVE, target);
    });
        
    test('subscribe sync', 23, function() {
        var name = 'a.b.c',
            target = {
                topic : topics.SYNC+name+'.'+this.collab.id, 
                value : 'b',
                type : 'update',
                position : 1,
                site : 10
            },
            cb = function(args) {
                equal(args.topic, target.topic, 'topic check');
                equal(args.value, target.value, 'value check');
                equal(args.type, target.type, 'type check');
                equal(args.position, target.position, 'position check');
                equal(args.site, target.site, 'site check');
                equal(args.name, name, 'name check');
            },
            obj = {
                sentinel : 'sentinel',
                cb : function() {
                    equal(this.sentinel, 'sentinel');
                    cb.apply(this, arguments);
                }
            };
        
        this.collab.subscribeSync(name, cb);
        this.collab.subscribeSync(name, obj, obj.cb);
        this.collab.subscribeSync(name, obj, 'cb');
        raises(this.collab.subscribeSync, 'bad sync name');
        try {
            this.collab.subscribeSync(name, obj, 'foo');
        } catch(e) {
            ok(true, 'bad function');
        }
        try {
            this.collab.subscribeSync(null, obj, 'foo');
        } catch(x) {
            ok(true, 'bad sync name');
        }
        OpenAjax.hub.publish(target.topic, target);
    });
    
    test('send sync', 2, function() {
        var tok,
            name = 'a.b.c.d',
            topic = topics.SYNC+name+'.'+this.collab.id,
            target = {
                value : 'b',
                type : 'insert',
                position : 1
            };
        tok = OpenAjax.hub.subscribe(topic, function(topic, params) {
            deepEqual(params, target);
        });
        this.collab.sendSync(name, target.value, target.type, target.position);
        OpenAjax.hub.unsubscribe(tok);
        
        // check defaults
        target.type = 'update';
        target.position = 0;
        tok = OpenAjax.hub.subscribe(topic, function(topic, params) {
            deepEqual(params, target);
        });
        // cleanup on teardown
        this._subs.push(tok);
        this.collab.sendSync(name, target.value);
    });
    
    test('subscribe state request', 7, function() {
        var target = 'token',
            cb = function(token) {
                equal(token, target);
            },
            obj = {
                sentinel : 'sentinel',
                cb : function(token) {
                    equal(this.sentinel, 'sentinel');
                    cb(token);
                }
            };
        
        this.collab.subscribeStateRequest(cb);
        this.collab.subscribeStateRequest(obj, obj.cb);
        this.collab.subscribeStateRequest(obj, 'cb');
        raises(this.collab.subscribeStateRequest, 'bad function');
        try {
            this.collab.subscribeStateRequest(obj, 'foo');
        } catch(e) {
            ok(true, 'bad function');
        }
        OpenAjax.hub.publish(topics.GET_STATE, target);
    });
    
    test('subscribe state response', 5, function() {
        var topic = topics.SET_STATE+this.collab.id,
            target = {
                a : 'a',
                b : 'b'
            },
            cb = function(state) {
                deepEqual(state, target);
            },
            obj = {
                sentinel : 'sentinel',
                cb : function(state) {
                    equal(this.sentinel, 'sentinel');
                    cb(state);
                }
            };

        this.collab.subscribeStateResponse(cb);
        this.collab.subscribeStateResponse(obj, obj.cb);
        this.collab.subscribeStateResponse(obj, 'cb');
        OpenAjax.hub.publish(topic, target);
    });
    
    test('send state response', 1, function() {
        var tok,
            topic = topics.SET_STATE+this.collab.id,
            target = {
                state : {
                    a : 'a',
                    b : 'b'
                },
                recipient : '12312313'
            };
        tok = OpenAjax.hub.subscribe(topic, function(topic, params) {
            deepEqual(params, target);
        });
        this._subs.push(tok);
        this.collab.sendStateResponse(target.state, target.recipient);
    });
    
    test('subscribe service', 14, function() {
        var tok, service = 'foobar',
            subTopic = topics.SUB_SERVICE+service,
            subTarget = {
                topic : topics.SET_SERVICE+service,
                service : service
            },
            pubTopic = topics.SET_SERVICE+service,
            pubTarget = {
                value: {
                    a: 'a',
                    b : 'b'
                },
                error : false
            },
            cb = function(args) {
                deepEqual(args.value, pubTarget.value);
                equal(args.error, pubTarget.error);
            },
            obj = {
                sentinel : 'sentinel',
                cb : function(args) {
                    equal(this.sentinel, 'sentinel');
                    cb(args);
                }
            };
        // listen for publishes upon subscribe
        tok = OpenAjax.hub.subscribe(subTopic, function(topic, value) {
            equal(topic, subTopic);
            deepEqual(value, subTarget);
        });
        this._subs.push(tok);
        
        // do the subscribes
        this.collab.subscribeService(service, cb);
        this.collab.subscribeService(service, obj, obj.cb);
        this.collab.subscribeService(service, obj, 'cb');
        
        // simulate a service bot publish
        OpenAjax.hub.publish(topics.SET_SERVICE+service, pubTarget);
        // simulate a publish from a different bot
        OpenAjax.hub.publish(topics.SET_SERVICE+service+'1', pubTarget);
    });
    
    test('post to service', 6, function() {
        var tok, service = 'foobar',
            respTopic = topics.SET_SERVICE+service+'_0.'+this.collab.id,
            reqTopic = topics.GET_SERVICE+service,
            reqTarget = {
                topic : respTopic,
                params : {
                    a : 'a',
                    b : 'b'
                },
                service : service
            },
            respTarget = {
                value : {
                    c : 'c',
                    d : 'd'
                },
                error : false
            },
            cb = function(args) {
                deepEqual(args.value, respTarget.value);
                equal(args.error, respTarget.error);
            },
            obj = {
                sentinel : 'sentinel',
                cb : function(args) {
                    equal(this.sentinel, 'sentinel');
                    cb(args);
                }
            };
        // listen for publishes upon subscribe
        tok = OpenAjax.hub.subscribe(reqTopic, function(topic, value) {
            equal(topic, reqTopic);
            deepEqual(value, reqTarget);
        });
        this._subs.push(tok);
        
        // do the post
        this.collab.postService(service, reqTarget.params, obj, 'cb');
        
        // simulate a service bot response
        OpenAjax.hub.publish(respTopic, respTarget);
        // simulate a second response that should get ignored
        OpenAjax.hub.publish(respTopic, respTarget);
        // whitebox: poke at hub to make sure we're unsubscribing
        strictEqual(OpenAjax.hub._subscriptions.c.coweb.c.service.response, 
            undefined);
    });
    
    test('unsubscribe', 10, function() {
        var toks = [],
            syncName = 'a.b',
            serviceName = 'bazbot',
            cb = function() {
                ok(false, 'should never fire');
            },
            subs = OpenAjax.hub._subscriptions,
            serviceSubs, syncSubs;

        // do some subscribes
        toks.push(this.collab.subscribeSync(syncName, cb));
        toks.push(this.collab.subscribeSync(syncName, this, cb));
        toks.push(this.collab.subscribeService(serviceName, cb));
        toks.push(this.collab.subscribeService(serviceName, this, cb));
        
        // whitebox: poke at hub to make sure we're unsubscribing
        serviceSubs = subs.c.coweb.c.service.c.response.c.bazbot.s;
        syncSubs = subs.c.coweb.c.sync.c.a.c.b.c.test.s;

        // unsubscribe one by one
        equal(serviceSubs.length, 2);
        equal(syncSubs.length, 2);
        this.collab.unsubscribe(toks[0]);
        equal(syncSubs.length, 1);
        equal(serviceSubs.length, 2);
        this.collab.unsubscribe(toks[1]);
        equal(syncSubs.length, 0);
        equal(serviceSubs.length, 2);
        this.collab.unsubscribe(toks[2]);
        equal(syncSubs.length, 0);
        equal(serviceSubs.length, 1);
        this.collab.unsubscribe(toks[3]);
        equal(syncSubs.length, 0);
        equal(serviceSubs.length, 0);
    });
    
    test('unsubscribe all', 0, function() {
        var cb = function() {
                ok(false, 'should never fire');
            },
            tok,
            syncName = 'a.b.c.d',
            syncTopic = topics.SYNC+syncName+'.'+this.collab.id,
            syncTarget = {
                value : 'b',
                type : 'update',
                position : 1,
                site : 10
            },
            serviceName = 'foobar',
            serviceTopic = topics.SET_SERVICE+serviceName,
            serviceTarget = {
                value: {
                    a: 'a',
                    b : 'b'
                },
                error : false
            };

        // test regular subscribes
        this.collab.subscribeSync(syncName, cb);
        this.collab.subscribeSync(syncName, this, cb);
        this.collab.subscribeService(serviceName, cb);
        this.collab.subscribeService(serviceName, this, cb);
        // test service subscribes
        this.collab.unsubscribeAll();
        // whitebox test: make sure tokens contains nothing
        for(tok in this.collab._tokens) {
            if(this.collab._tokens.hasOwnProperty(tok)) {
                ok(false, tok);
            }
        }
        // publish to make sure nothing gets received
        OpenAjax.hub.publish(syncTopic, syncTarget);
        OpenAjax.hub.publish(serviceTopic, serviceTarget);
    });
});