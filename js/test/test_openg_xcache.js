//
// Tests for op engine transformed op most recent context vector (MCRV) caching
// for O(N) vs O(N^3) scaling with sites.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
//
/*global define equals equal deepEqual module test ok*/
define([
    'util'
], function(util) {
    module('op engine xcache', {
        teardown: function() {
            // clean up all clients
            util.all_clients = [];
        }
    });

    test('two site lag - DISABLED', 0, function() {
        ok(true, 'test will freeze browser, need caching in op engine');
        return;
    
        var a = new util.OpEngClient(0, {symbol : '1 2'});
        var b = new util.OpEngClient(1, {symbol : '1 2'});
    
        var aStr = 'abcdefghijkl';
        var bStr = 'mnopqrstuvwxyz';
        var op;
        var aOps = [], bOps = [];
        // lots of typing on a after the "1"
        for(var i=0, pos=1; i < aStr.length; i++, pos++) {
            op = a.local('symbol', aStr[i], 'insert', pos);
            aOps.push(op);
            a.send(op);
        }
    
        // lots of typing on b after the "2"
        for(i=0, pos=3; i < bStr.length; i++, pos++) {
            op = b.local('symbol', bStr[i], 'insert', pos);
            bOps.push(op);
            b.send(op);
        }

        a.recvAll();
        b.recvAll();
    
        var correct = {symbol : '1abcdefghijkl 2mnopqrstuvwxyz'};
        deepEqual(a.state, correct, 'client state check');
        equals(a.eng.getBufferSize(), 26);
        deepEqual(b.state, correct, 'client state check');
        equals(b.eng.getBufferSize(), 26); 
    });
    
    test('three site lag', 1, function() {
        
    });
});