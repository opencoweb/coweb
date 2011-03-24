//
// Tests for op engine puzzles.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
define([
    'util'
], function(util) {
            var logCurr = function(a) {
            console.log('Site %d has state %s in %s', a.eng.siteId+1, a.state.symbol, 
                a.eng.cv.toString());
            states[a.eng.siteId].push(a.state.symbol);
        };

    
    module('op engine debug', {
        teardown: function() {
            // clean up all clients
            util.all_clients = [];
        }
    });
    
    test('three-site original puzzle', 0, function() {
        var states = [[], [], []];
        var a = new util.OpEngClient(0, {symbol : 'abc'});
        var b = new util.OpEngClient(1, {symbol : 'abc'});
        var c = new util.OpEngClient(2, {symbol : 'abc'});
        console.log('Site 1 sends O1');
        var o1 = a.local('symbol', '1', 'insert', 1);
        logCurr(a);
        console.log('Site 2 sends O2');
        var o2 = b.local('symbol', null, 'delete', 1);
        logCurr(b);
        console.log('Site 3 sends O3');
        var o3 = c.local('symbol', '2', 'insert', 2);
        logCurr(c);

        console.log('========================');
        console.log('Site 1 receives O3');
        a.remote(o3);
        logCurr(a);
        console.log('\nSite 1 receives O2');
        a.remote(o2);
        logCurr(a);

        console.log('-----');
        console.log('\nSite 2 receives O1');
        b.remote(o1);
        logCurr(b);
        console.log('\nSite 2 receives O3');
        b.remote(o3);
        logCurr(b);
        
        console.log('-----');
        console.log('\nSite 3 receives O2');
        c.remote(o2);
        logCurr(c);
        console.log('\nSite 3 receives O1');
        c.remote(o1);
        logCurr(c);

        console.log('========================');
        for(var key in states) {
            console.log('Site %s state changes', key);
            for(var i=0, l=states[key].length; i<l; i++) {
                console.log(states[key][i]);
            }
        }
    });
    
    test('three-site O1->O2->O3 puzzle', 0, function() {
         
    });
});