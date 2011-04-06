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

    test('two site lag - DISABLED', 1, function() {
        return;

        var a = new util.OpEngClient(0, {symbol : '1 2'});
        var b = new util.OpEngClient(1, {symbol : '1 2'});
    
        var aStr = 'ab';
        var bStr = 'mn';
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
    
        var correct = {symbol : '1'+aStr+' 2'+bStr};
        deepEqual(a.state, correct, 'client state check');
        equals(a.eng.getBufferSize(), aStr.length+bStr.length);
        deepEqual(b.state, correct, 'client state check');
        equals(b.eng.getBufferSize(), aStr.length+bStr.length); 
    });
    
    test('three site lag', 1, function() {
        
    });
});