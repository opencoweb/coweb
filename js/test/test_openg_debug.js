//
// Tests for op engine puzzles.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
define([
    'util'
], function(util) {    
    module('op engine debug', {
        setup : function() {
            this.states = [[], [], []];
            console.log('SETUP ========================');
        },
        
        teardown: function() {
            console.log('========================');
            for(var key in this.states) {
                console.log('Site %s state changes', key);
                for(var i=0, l=this.states[key].length; i<l; i++) {
                    console.log(this.states[key][i]);
                }
            }
            console.log('TEARDOWN ========================');
            
            // clean up all clients
            util.all_clients = [];
        },
        
        logCurr: function(a) {
            console.log('Site %d has state %s in %s', a.eng.siteId+1, a.state.symbol, 
                a.eng.cv.toString());
            this.states[a.eng.siteId].push(a.state.symbol);
        }
    });
    
    test('three-site original puzzle', 0, function() {
        var a = new util.OpEngClient(0, {symbol : 'abc'});
        var b = new util.OpEngClient(1, {symbol : 'abc'});
        var c = new util.OpEngClient(2, {symbol : 'abc'});
        console.log('Site 1 sends O1');
        var o1 = a.local('symbol', '1', 'insert', 1);
        this.logCurr(a);
        console.log('Site 2 sends O2');
        var o2 = b.local('symbol', null, 'delete', 1);
        this.logCurr(b);
        console.log('Site 3 sends O3');
        var o3 = c.local('symbol', '2', 'insert', 2);
        this.logCurr(c);

        console.log('Site 1 receives O3');
        a.remote(o3);
        this.logCurr(a);
        console.log('\nSite 1 receives O2');
        a.remote(o2);
        this.logCurr(a);

        console.log('-----');
        console.log('\nSite 2 receives O1');
        b.remote(o1);
        this.logCurr(b);
        console.log('\nSite 2 receives O3');
        b.remote(o3);
        this.logCurr(b);
        
        console.log('-----');
        console.log('\nSite 3 receives O2');
        c.remote(o2);
        this.logCurr(c);
        console.log('\nSite 3 receives O1');
        c.remote(o1);
        this.logCurr(c);
    });
    
    test('three-site O1->O2->O3 puzzle', 3, function() {
        var a = new util.OpEngClient(0, {symbol : 'abc'});
        var b = new util.OpEngClient(1, {symbol : 'abc'});
        var c = new util.OpEngClient(2, {symbol : 'abc'});
        console.log('Site 1 sends O1');
        var o1 = a.local('symbol', '1', 'insert', 1);
        a.send(o1);
        this.logCurr(a);
        console.log('Site 2 sends O2');
        var o2 = b.local('symbol', null, 'delete', 1);
        b.send(o2);
        this.logCurr(b);
        console.log('Site 3 sends O3');
        var o3 = c.local('symbol', '2', 'insert', 2);
        c.send(o3);
        this.logCurr(c);

        console.log('========================');
        var sites = [a,b,c];
        var ops = [1,2,3];
        var correct = a.state;
        for(var i=0, l=sites.length; i<l; i++) {
            for(var j=0; j<3; j++) {
                console.log('Site %d receives O%d', i+1, j+1);
                sites[i].recv();
                this.logCurr(sites[i]);
            }
            console.log('---------------');
            deepEqual(sites[i].state, correct);
        }
    });

    test('three-site O2->O1->O3 puzzle', 0, function() {
        var a = new util.OpEngClient(0, {symbol : 'abc'});
        var b = new util.OpEngClient(1, {symbol : 'abc'});
        var c = new util.OpEngClient(2, {symbol : 'abc'});
        console.log('Site 2 sends O2');
        var o2 = b.local('symbol', null, 'delete', 1);
        b.send(o2);
        this.logCurr(b);
        console.log('Site 1 sends O1');
        var o1 = a.local('symbol', '1', 'insert', 1);
        a.send(o1);
        this.logCurr(a);
        console.log('Site 3 sends O3');
        var o3 = c.local('symbol', '2', 'insert', 2);
        c.send(o3);
        this.logCurr(c);

        console.log('========================');
        var sites = [a,b,c];
        var ops = [2,1,3];
        var correct = a.state;
        for(var i=0, l=sites.length; i<l; i++) {
            for(var j=0; j<3; j++) {
                console.log('Site %d receives O%d', i, j);
                sites[i].recv();
                this.logCurr(sites[i]);
            }
            console.log('---------------');
            deepEqual(sites[i].state, correct);
        }
    });
});