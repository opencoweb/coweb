//
// Tests the SimpleLoader class.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
//
/*global define module test raises equal deepEqual*/
define([
    'coweb/main',
    'coweb/ext/SimpleLoader',
    'mock/CowebServer',
    'util',
    'mock/xhr'
], function(coweb, SimpleLoader, CowebServer, util, xhr) {
    module('loader', {
        setup: function() {
            this.timeout = 5000;
            this.server = new CowebServer();
            xhr.hook();
            xhr.addServer('/admin', this.server);
            xhr.addServer('/login', this.server);
            xhr.addServer('/logout', this.server);
            xhr.addServer('/session/12345', this.server);
        },
        teardown: function() {
            xhr.unhook();
            xhr.clearServers();
            coweb.reset();
        }
    });

    test('loader success', 5, function() {
        var self = this,
            id = 'test';

        var loader = new SimpleLoader(id);
        loader.onRun = function() {
            equal(loader.collab.id, id);
        };
        loader.onSessionPrepared = function(info) {
            // pull out phase
            var phase = info.phase;
            delete info.phase; 
            deepEqual(info, self.server.prepResp);
            equal(phase, 'prepare');
        };
        loader.onSessionJoined = function(info) {
            equal(info.phase, 'join');
        };
        loader.onSessionUpdated = function(info) {
            equal(info.phase, 'update');
            start();
        };
        loader.onSessionFailed = function() {
            ok(false, 'session failed');
        };

        // wait while running
        stop(this.timeout);
        // start prepare
        loader.run();
        // start server processing
        this.server.start();
    });
    
    test('loader failure', 2, function() {
        var loader = new SimpleLoader('test2');
        loader.onRun = function() {
            ok(true, 'running');
        };
        loader.onSessionPrepared = function() {
            ok(false, 'unexpected prepared');
        };
        loader.onSessionJoined = function() {
            ok(false, 'unexpected join');
        };
        loader.onSessionUpdated = function() {
            ok(false, 'unexpected update');
            start();
        };
        loader.onSessionFailed = function(err) {
            ok(err, 'session failed');
            start();
        };

        // server side handling of prep
        this.server.onPrepareRequest = function(server, req, respPromise) {
            throw new Error(403);
        };

        // wait while running
        stop(this.timeout);
        // start prepare
        loader.run();
        // start server processing
        this.server.start();        
    });
});