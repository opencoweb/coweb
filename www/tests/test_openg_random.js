//
// Generates random tests for op engine.
//
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
dojo.provide('tests.test_openg_random');
dojo.require('tests.util');

module('op engine random puzzles', {
    teardown: function() {
        // clean up all clients
        tests.util.OpEngClient.all_clients = [];
    }
});

test('two site random puzzles', 0, function() {
    return;
    for(var i=0.01; i < 0.8; i+=0.01) {
        var log = tests.util.randomOperations(2, 15, ['topic1'], i);
        // make sure all sites have processed all events
        dojo.forEach(log.sites, function(site) {
            equals(site.incoming.length, 0, 'client ' + site.eng.siteId + ' incoming queue check');
        });
        // check the final state
        dojo.forEach(log.params.topics, function(topic) {
            var first = null;
            dojo.forEach(log.sites, function(site) {
                if(first == null) {
                    first = site.state[topic];
                } else {
                    equals(site.state[topic], first, 'client ' + site.eng.siteId + ' state check');
                    if(site.state[topic] != first) {
                        var sc = tests.util.scriptOperations(log);
                        console.log(sc);
                    }
                }
            });
        });
    }
});

test('three site random puzzles', 0, function() {
    return;
    for(var i=0.01; i < 0.35; i+=0.01) {
        var log = tests.util.randomOperations(3, 15, ['topic1'], i);
        // make sure all sites have processed all events
        dojo.forEach(log.sites, function(site) {
            equals(site.incoming.length, 0, 'client ' + site.eng.siteId + ' incoming queue check');
        });
        // check the final state
        dojo.forEach(log.params.topics, function(topic) {
            var first = null;
            dojo.forEach(log.sites, function(site) {
                if(first == null) {
                    first = site.state[topic];
                } else {
                    equals(site.state[topic], first, 'client ' + site.eng.siteId + ' state check');
                    if(site.state[topic] != first) {
                        var sc = tests.util.scriptOperations(log);
                        console.log(sc);
                    }
                }
            });
        });
    }
});