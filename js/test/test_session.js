//
// Tests the BayeuxSession implementation of the SessionInterface against
// a mock Bayeux/coweb server.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*global test define start equal equals deepEqual ok stop module*/
define([
    'coweb/main',
    'coweb/util/lang',
    'util',
    'mock/xhr',
    'mock/CowebServer',
    'org/OpenAjax'
], function(coweb, lang, util, xhr, CowebServer, OpenAjax) {    
    var sessionModOpts = {
        setup: function() {
            try {
                xhr.clearServers();
                xhr.unhook();
            } catch(e) {}
            this.timeout = 5000;
            this.prepReq = {
                key : 10, 
                collab : true, 
                autoJoin : false, 
                autoUpdate: false
            };
            this.autoPrepReq = {
                key : this.prepReq.key,
                collab : this.prepReq.collab
            };
            this.hubToks = [];
            this.session = coweb.initSession();
            this.server = new CowebServer();
            this.collabs = [];
            var fs = this.server.fullState;
            for(var i=0, l=fs.length; i<l; i++) {
                var item = fs[i];
                var topic = item.topic;
                var segs = topic.split('.');
                topic = segs[segs.length-1];
                this.collabs.push(coweb.initCollab({id : topic}));
            }
            xhr.hook();
            xhr.addServer('/admin', this.server);
            xhr.addServer('/login', this.server);
            xhr.addServer('/logout', this.server);
            xhr.addServer('/session/12345', this.server);
        },
        teardown: function() {
            var i, l;
            for(i=0, l=this.hubToks.length; i<l; i++) {
                OpenAjax.hub.unsubscribe(this.hubToks[i]);
            }
            for(i=0, l=this.collabs.length; i<l; i++) {
                this.collabs[i].unsubscribeAll();
            }
            coweb.reset();
            xhr.clearServers();
            xhr.unhook();
        },
    
        hubSub: function() {
            var tok = OpenAjax.hub.subscribe.apply(OpenAjax.hub, arguments);
            this.hubToks.push(tok);
            return tok;
        }
    };

    module('session', sessionModOpts);

    test('get version', 1, function() {
        ok(coweb.VERSION, 'version is defined');
    });

    test('is debug', 1, function() {
        ok(!this.session.isDebug(), 'debug disabled');
    });

    test('abort before preparing', 1, function() {
        this.session.leave();
        equals(this.session.getLastPrepare(), null, 'client prep params check');
    });

    test('prepare conference', 5, function() {
        var self = this;
        var server = this.server;
        // client side prep
        this.session.prepare(this.prepReq)
        .then(function(info) {
            var phase = info.phase;
            delete info.phase;
            deepEqual(info, server.prepResp, 'client session info check');
            equal(phase, 'prepare', 'phase check');
            start();
        });
    
        // server side handling of prep
        server.onPrepareRequest = function(server, req, resp) {
            // check received data
            equals(req.args.url, '/admin', 'server url check');
            var data = JSON.parse(req.args.body);
            equals(data.key, self.prepReq.key, 'server key check');
            equals(data.collab, self.prepReq.collab, 'server collab flag check');
        
            // respond to request
            resp.resolve(server.prepResp);
        };

        // wait while running 
        stop(this.timeout);
        // start server processing    
        this.server.start();
    });

    test('abort while preparing', 0, function() {
        var self = this;
        var server = this.server;

        // client side prep
        this.session.prepare(this.prepReq)
        .then(function(info) {
            ok(false, 'aborted prepare succeeded');
        }, function(err) {
            ok(false, 'aborted prepare errored');
        });
    
        // server side handling of prepare
        server.onPrepareRequest = function(server, req, respPromise) {
            // respond to aborted request
            respPromise.resolve(server.prepResp);
            // start again later to ensure client doesn't get the response
            setTimeout(start, 500);
        };
    
        // abort the request immediately
        this.session.leave();
        // wait while running
        stop(this.timeout);
        // start server processing    
        this.server.start();
    });

    test('auth error while preparing', 1, function() {
        var self = this;
        var server = this.server;

        // client side prep
        this.session.prepare(this.prepReq)
        .then(function(info) {
            ok(false, 'unauthorized prepare succeeded');
        }, function(err) {
            equals(err.message, 'not-allowed', 'response error check');
            start();
        });
    
        // server side handling of prep
        server.onPrepareRequest = function(server, req, respPromise) {
            throw new Error(403);
        };

        // wait while running
        stop(this.timeout);
        // start server processing
        this.server.start();
    });

    test('server error while preparing', 0, function() {
        var self = this;
        var server = this.server;
    
        // client side prep
        this.session.prepare(this.prepReq)
        .then(function(info) {
            ok(false, 'prepare succeeded during server error');
        }, function(err) {
            equals(err.message, 'server-unavailable', 'response error check');
            start();
        });
    
        // server side handling of prep
        server.onPrepareRequest = function(server, req, respPromise) {
            throw new Error(0);
        };

        // wait while running
        stop(this.timeout);
        // start server processing
        this.server.start();
    });

    test('app error while preparing', 1, function() {
        var self = this;
        this.session.prepare(this.prepReq)
        .then(function() {
            throw new Error('simulate app error during prepare');
        }).then(function() {
            ok(false, 'success after prepare error');
        }, function(err) {
            ok(err, 'error raised after prepare error');
            start();
        });

        // wait while running
        stop(this.timeout);
        // start server processing
        this.server.start();
    });

    test('join empty conference', 4, function() {
        var self = this;
    
        this.session.prepare(this.autoPrepReq).then(start);

        // server side
        // use default prep response
        // confirm all session join subscriptions
        this.server.onMetaSubscribe = function(server, msg, resp) {
            var t;
            if(server.joinTopics.length) {
                t = server.joinTopics.shift();
                equals(msg.subscription, t, 'subscribed to join channel');
            } else if(server.updaterTopics.length) {
                t = server.updaterTopics.shift();
                equals(msg.subscription, t, 'subscribed to updater channel');        
            } else {
                ok(false, 'extra subscription detected');
            }

            if(server.joinTopics.length === 0) {
                // send back site id, roster, state
                server.sendSiteId(1);
                server.sendFullRoster();
                server.sendState();
            }
        };

        // wait while running
        stop(this.timeout);
        // start server processing
        this.server.start();
    });

    test('join ongoing conference', 2, function() {
        var self = this; 
    
        // listen for received state
        for(var i=0, l=this.collabs.length; i<l; i++) {
            var collab = this.collabs[i];
            (function(i){
                var target = self.server.fullState[i];
                collab.subscribeStateResponse(function(state) {
                    equals(state, target.value, collab.id + ' state received');
                });
            }(i));
        }
    
        this.session.prepare(this.autoPrepReq).then(start);

        // wait while running
        stop(this.timeout);
        // start server processing
        this.server.start();
    });

    test('abort while joining', 0, function() {
        var self = this; 
    
        this.session.prepare(this.autoPrepReq)
        .then(function() {
            ok(false, 'join succeeded after abort');
        }, function() {
            ok(false, 'join errored after abort');
        });

        // server side
        // use default prep response
        // abort the client in the middle of the subscribes
        this.server.onMetaSubscribe = function(server, msg, resp) {
            if(msg.subscription === server.joinTopics[1]) {
                // sudden client abort
                self.session.leave();
                // start again later to ensure client doesn't get the response
                setTimeout(start, 1000);
            }
        };

        // wait while running
        stop(this.timeout);
        // start server processing
        this.server.start();
    });

    test('join without prepare', 1, function() {
        try {
            this.session.join();
        } catch(e) {
            ok(e, 'invalid join without prepare');
        }
    });

    test('auth error while joining', 0, function() {
        var self = this;
        var server = this.server;

        // client side prep
        this.session.prepare(this.prepReq)
        .then(function(info) {
            // immediately join after prepare
            return self.session.join();
        }).then(function() {
            ok(false, 'unauthorized join succeeded');
        }, function(err) {
            equals(err.message, 'not-allowed', 'response error check');
            start();
        });
    
        // server side handling of session handshake
        server.onMetaHandshake = function(server, msg, resp) {
            throw new Error(403);
        };

        // wait while running
        stop(this.timeout);
        // start server processing
        this.server.start();
    });

    test('server error while joining', 0, function() {
        var self = this;
        var server = this.server;

        // client side prep
        this.session.prepare(this.prepReq)
        .then(function(info) {
            // immediately join after prepare
            return self.session.join();
        }).then(function() {
            ok(false, 'join during server error succeeded');
        }, function(err) {
            equals(err.message, 'session-unavailable', 'response error check');
            start();
        });
    
        // server side handling of session handshake
        server.onMetaHandshake = function(server, msg, resp) {
            throw new Error(404);
        };

        // wait while running
        stop(this.timeout);
        // start server processing
        this.server.start();
    });

    test('app error while joining', 1, function() {
        var self = this;
        this.session.prepare(this.prepReq)
        .then(function() {
            return self.session.join();
        }).then(function() {
            throw new Error('simulate app error during join');
        }).then(function() {
            ok(false, 'success after join error');
        }, function(err) {
            ok(err, 'error raised after join error');
            start();
        });

        // wait while running
        stop(this.timeout);
        // start server processing
        this.server.start();
    });

    test('update without prepare', 1, function() {
        try {
            this.session.update();
        } catch(e) {
            ok(e, 'invalid update without prepare');
        }
    });

    test('update without join', 0, function() {
        var self = this;

        // client side prep
        this.session.prepare(this.prepReq)
        .then(function(params) {
            // update without joining
            try {
                self.session.update();
            } catch(e) {
                start();
                return;
            }
            ok(false, 'invalid update without prepare');
        });
        // wait while running
        stop(this.timeout);
        // start server processing
        this.server.start();
    });

    test('server error while updating', 0, function() {
        var self = this;
        var server = this.server;
    
        // client side prep
        this.session.prepare(this.prepReq)
        .then(function(params) {
            // immediately join after prepare
            return self.session.join();
        }).then(function(params) {
            return self.session.update();
        }).then(function() {
            ok(false, 'update succeeded during server error');
        }, function(err) {
            equals(err.message, 'server-unavailable', 'response error check');
            start();
        });
    
        // server side handling of prep
        server.onMetaSubscribe = function(server, msg, resp) {
            // die on the first subscription
            throw new Error(0);
        };

        // wait while running
        stop(this.timeout);
        // start server processing
        this.server.start();
    });

    test('app error while updating', 1, function() {
        var self = this;
    
        // fail on second widget state
        this.collabs[1].subscribeStateResponse(function(state) {
            throw new Error('app error during update');
        });

        this.session.prepare(this.prepReq)
        .then(function() {
            return self.session.join();
        }).then(function(params) {
            return self.session.update();
        }).then(function() {
            ok(false, 'update succeeded after bad state');
        }, function(err) {
            equals(err.message, 'bad-application-state', 'response error check');
            start();
        });

        // wait while running
        stop(this.timeout);
        // start server processing
        this.server.start();
    });

    test('abort after updating', 1, function() {
        var self = this;
    
        // check notification of leaving conference
        var x = this.collabs[0].subscribeEnd(function(params) {
            ok(params.connected, 'conference end event check');
            start();
        });
    
        this.session.prepare(this.prepReq)
        .then(function() {
            return self.session.join();
        }).then(function(params) {
            return self.session.update();
        }).then(function() {
            self.session.leave();
        });

        // wait while running
        stop(this.timeout);
        // start server processing
        this.server.start();
    });

    test('manual prepare, join, update', 6, function() {
        var self = this;

        var server = this.server;
        var prep = this.prepReq;
        this.session.prepare(prep)
        .then(function(info) {
            var phase = info.phase;
            delete info.phase;
            deepEqual(info, server.prepResp, 'client prepare info check');
            equal(phase, 'prepare');
            return self.session.join();
        }).then(function(info) {
            var phase = info.phase;
            delete info.phase;
            deepEqual(info, server.prepResp, 'client join info check');
            equal(phase, 'join');
            return self.session.update();
        }).then(function(info) {
            var phase = info.phase;
            delete info.phase;
            deepEqual(info, server.prepResp, 'client update info check');
            equal(phase, 'update');
            start();
        });

        // wait while running
        stop(this.timeout);
        // start server processing
        this.server.start();
    });

    test('manual prepare, update', 4, function() {
        var self = this;
        var server = this.server;
        var prep = this.prepReq;
        prep.autoJoin = true;
        prep.autoUpdate = false;
        
        this.session.prepare(prep)
        .then(function(info) {
            // completed auto-join
            var phase = info.phase;
            delete info.phase;
            deepEqual(info, server.prepResp, 'client join info check');
            equal(phase, 'join');
            return self.session.update();
        }).then(function(info) {
            // completed manual update
            var phase = info.phase;
            delete info.phase;
            deepEqual(info, server.prepResp, 'client update info check');
            equal(phase, 'update');
            start();
        });

        // wait while running
        stop(this.timeout);
        // start server processing
        this.server.start();
    });

    test('manual prepare, join', 4, function() {
        var self = this;
        var server = this.server;
        var prep = this.prepReq;
        prep.autoJoin = false;
        prep.autoUpdate = true;

        this.session.prepare(prep)
        .then(function(info) {
            // completed manual prepare
            var phase = info.phase;
            delete info.phase;
            deepEqual(info, server.prepResp, 'client prepare info check');
            equal(phase, 'prepare');
            return self.session.join();
        }).then(function(info) {
            // completed auto-update
            var phase = info.phase;
            delete info.phase;
            deepEqual(info, server.prepResp, 'client update info check');
            equal(phase, 'update');
            start();
        });

        // wait while running
        stop(this.timeout);
        // start server processing
        this.server.start();
    });

    test('leave session', 1, function() {
        var self = this;
    
        // check notification of leaving conference
        this.collabs[0].subscribeEnd(function(params) {
            ok(params.connected, 'conference end event check');
            start();
        });
    
        this.session.prepare(this.prepReq)
        .then(function() {
            return self.session.join();
        }).then(function(params) {
            return self.session.update();
        }).then(function() {
            self.session.leave();
        });

        // wait while running
        stop(this.timeout);
        // start server processing
        this.server.start();
    });

    test('server crash in session', 1, function() {
        var self = this;
    
        // check notification of leaving conference
        this.collabs[0].subscribeEnd(function(params) {
            ok(!params.connected, 'conference end event check');
            start();
        });
    
        // get all the way into the session
        this.session.prepare(this.autoPrepReq);
    
        // kill the server after the update completes
        var orig = this.server.onMetaSubscribe;
        var updated = false;
        this.server.onMetaSubscribe = function(server, msg, resp) {
            orig.apply(server, arguments);
            if(msg.subscription === server.updaterTopics[0]) {
                updated = true;
            }
        };
        this.server.onMetaConnect = function(server, msg, resp) {
            if(updated) {
                setTimeout(function() {
                    server._lp.fail(new Error(0));
                }, 1000);
            }
        };

        // wait while running
        stop(this.timeout);
        // start server processing
        this.server.start();
    });

    test('login', 1, function() {
        this.session.login('john.doe', 'mypass')
        .then(function(resp) {
            ok(true, 'login check');
            start();
        }, function(err) {
            ok(false, 'login failed');
        });
    
        // wait while running 
        stop(this.timeout);
        // start server processing    
        this.server.start();
    });

    test('bad login', 1, function() {
        this.session.login('john.doe', 'badpass')
        .then(function(resp) {
            ok(false, 'bad login succeeded');
        }, function(err) {
            ok(true, 'bad login check');
            start();
        });
    
        // wait while running 
        stop(this.timeout);
        // start server processing    
        this.server.start();
    });

    test('permanent logout', 1, function() {
        var self = this;

        this.session.prepare(this.autoPrepReq)
        .then(function(params) {
            return params.nextPromise;
        }).then(function(params) {
            return params.nextPromise;
        }).then(function() {
            // logout after update succeeds
            self.session.logout(true);
        });
    
        this.server.onLogoutRequest = function(server, req, respPromise) {
            ok(req, 'logout check');
            respPromise.callback();
        };
        this.server.onMetaDisconnect = function(server, msg, resp) {
            start();
        };

        // wait while running
        stop(this.timeout);
        // start server processing
        this.server.start();
    });

    test('busy notices', 4, function() {
        var self = this; 
    
        // listen for busy notifications
        var expected = ['preparing', 'joining', 'updating', 'ready'];
        this.session.onStatusChange = function(value) {
            var e = expected.shift();
            equals(value, e, 'busy state change check');
            if(!expected.length) {
            // start tests again after a delay to ensure no more events coming
                setTimeout(start, 1000);
            }
        };

        // do prep and join
        this.session.prepare(this.autoPrepReq);
        
        // wait while running
        stop(this.timeout);
        // start server processing
        this.server.start();
    });

    test('busy abort notice', 5, function() {
        var self = this; 
    
        // listen for busy notifications
        var expected = ['preparing', 'joining', 'updating', 'aborting', 'clean-disconnect'];
        this.session.onStatusChange = function(value) {
            var e = expected.shift();
            equals(value, e, 'busy state change check');
            if(!expected.length) {
            // start tests again after a delay to ensure no more events coming
                setTimeout(start, 1000);
            }
        };

        // do prep and join
        this.session.prepare(this.autoPrepReq);

        // abort the client in the middle of the subscribes
        this.server.onMetaSubscribe = function(server, msg, resp) {
            // sudden client abort
            self.session.leave();
            // don't do it again
            server.onMetaSubscribe = function() {};
        };

        // wait while running
        stop(this.timeout);
        // start server processing
        this.server.start();
    });

    test('reuse session interface', 12, function() {
        var self = this;
        var server = this.server;
        
        this.session.prepare(this.prepReq)
        .then(function(info) {
            var phase = info.phase;
            delete info.phase;
            deepEqual(info, server.prepResp, 'first try prepare info check');
            equal(phase, 'prepare');
            return self.session.join();
        }).then(function(info) {
            var phase = info.phase;
            delete info.phase;
            deepEqual(info, server.prepResp, 'first try join info check');
            equal(phase, 'join');
            return self.session.update();
        }).then(function(info) {
            var phase = info.phase;
            delete info.phase;
            deepEqual(info, server.prepResp, 'first try update info check');
            equal(phase, 'update');

            // leave after updating
            self.session.leave();
            setTimeout(function() {
                // stop processing on the old server
                self.server.stop();
            
                // reset the server, don't care about cruft there
                server = self.server = new CowebServer();
                xhr.clearServers();
                xhr.addServer('/admin', self.server);
                xhr.addServer('/session/12345', self.server);
            
                // go back in again
                self.session.prepare(self.prepReq)
                .then(function(info) {
                    var phase = info.phase;
                    delete info.phase;
                    deepEqual(info, server.prepResp, 'second try prepare info check');
                    equal(phase, 'prepare');
                    return self.session.join();
                }).then(function(info) {
                    var phase = info.phase;
                    delete info.phase;
                    deepEqual(info, server.prepResp, 'second try join info check');
                    equal(phase, 'join');
                    return self.session.update();
                }).then(function(info) {
                    var phase = info.phase;
                    delete info.phase;
                    deepEqual(info, server.prepResp, 'second try update info check');
                    equal(phase, 'update');
                    start();
                });
            
                self.server.start();
            }, 1000);
        });

        // wait while running
        stop(this.timeout*2);
        // start server processing
        this.server.start();
    });
});