//
// Tests for op engine garbage collection.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
define([
    'util'
], function(util) {
    module('op engine gc', {
        teardown: function() {
            // clean up all clients
            util.OpEngClient.all_clients = [];
        }
    });

    test('garbage collection #1', 0, function() {
        var a = new util.OpEngClient(0, {symbol : ''});
        var b = new util.OpEngClient(1, {symbol : ''});
        // don't thaw c yet, just create it
        var c = new util.OpEngClient(2, {symbol : ''}, true);
    
        var a1 = a.local('symbol', 'A', 'insert', 0);
        b.remote(a1);
        b.purge();
        var a2 = a.local('symbol', '', 'delete', 0);
        b.remote(a2);
    
        // send late join state to c
        var state = a.eng.getState();
        c.eng.setState(state);
        // notify all sites of c's existence after update
        b.eng.thawSite(2);
    
        // this used to cause problems
        b.purge();
    
        var c1 = c.local('symbol', 'c', 'insert', 0);
        a.remote(c1)
        b.remote(c1)

        // make sure all engines clear properly now
        a.syncWith(b);
        b.syncWith(a);
        c.syncWith(b);
        a.purge();
        b.purge();
        c.purge();
    
        var correct = {symbol : 'c'};
        var sites = [a,b,c];
        for(var i=0, l=sites.length; i<l; i++) {
            var e = sites[i];
            deepEqual(e.state, correct, 'client state check');
            equals(e.eng.getBufferSize(), 0, 'history buffer size check');
        }
    });

    test('garbage collection #2', 9, function() {
        var a = new util.OpEngClient(0, {symbol : 'null'});
        var b = new util.OpEngClient(1, {symbol : 'null'});
        var c = new util.OpEngClient(2, {symbol : 'null'});

        var b1 = b.local('symbol', 'E02', 'update', -1);
        var a1 = a.local('symbol', 'E01', 'update', -1);
        c.remote(b1);
        a.remote(b1);
        b.remote(a1);

        var c1 = c.local('symbol', 'E04', 'update', -1);
        a.remote(c1);
    
        var b2 = b.local('symbol', 'E03', 'update', -1);
        a.remote(b2);
        c.remote(a1);
        b.remote(c1);
        c.remote(b2);

        // do engine syncs
        b.syncWith(a);
        c.syncWith(a);
        a.syncWith(b);
        c.syncWith(b);
        a.syncWith(c);
        b.syncWith(c);

        var correctState = {symbol : 'E03'};
        var correctMCV = '[1,2,1]';
        var sites = [a,b,c];
        for(var i=0, l=sites.length; i<l; i++) {
            var e = sites[i];
            var mcv = e.purge();
            equals(mcv.toString(), correctMCV, 'minimum context vector check');
            deepEqual(e.state, correctState, 'client state check');
            equals(e.eng.getBufferSize(), 0);
        }
    });

    test('garbage collection #3', 5, function() {
        var a = new util.OpEngClient(0, {symbol : 'IBM'});
        var b = new util.OpEngClient(1, {symbol : 'IBM'});

        var op, b1, b2;
        // b receives two ops from a
        op = a.local('symbol', 'a1', 'update', -1);  // acv=[1,0]
        b.remote(op);                                // bcv=[1,0], acv=[1,0]
        op = a.local('symbol', 'a2', 'update', -1);  // acv=[2,0]
        b.remote(op);                                // bcv=[2,0], acv=[2,0]
    
        // b generates two ops
        b1 = b.local('symbol', 'b1', 'update', -1);  // bcv=[2,1]
        b2 = b.local('symbol', 'b2', 'update', -1);  // bcv=[2,2]

        // b receives two more ops from a
        op = a.local('symbol', 'a3', 'update', -1);  // acv=[3,0]
        b.remote(op);                                // bcv=[3,2], acv=[3,0]
        op = a.local('symbol', 'a4', 'update', -1);  // acv=[4,0]
        b.remote(op);                                // bcv=[4,2], acv=[4,0]

        // a receives two ops from b
        a.remote(b1);                                // acv=[4,1], bcv=[2,1]
        a.remote(b2);                                // acv=[4,2], bcv=[2,2]

        // b sends two more ops
        b1 = b.local('symbol', 'b3', 'update', -1);  // bcv=[4,3]
        b2 = b.local('symbol', 'b4', 'update', -1);  // bcv=[4,4]

        // b receives one more ops from a
        op = a.local('symbol', 'a5', 'update', -1);  // acv=[5,2]
        b.remote(op);                                // bcv=[5,4], acv=[5,2]

        // b purges
        var mcv = b.purge();

        // b receives one more op from a
        op = a.local('symbol', 'a6', 'update', -1);  // acv=[6,2]
        b.remote(op);

        var correctMCV = '[5,2]';
        var correctState = {symbol : 'a6'};
        equals(mcv.toString(), correctMCV, 'minimum context vector check');
        deepEqual(a.state, correctState, 'client state check');
        deepEqual(b.state, correctState, 'client state check');
        equals(a.eng.getBufferSize(), 8);
        equals(b.eng.getBufferSize(), 4);
    });

    test('garbage collection #4', 5, function() {
        var a = new util.OpEngClient(0, {symbol : 'IBM'});
        var b = new util.OpEngClient(1, {symbol : 'IBM'});
    //    c = new coweb.jsoe.pbs.jsoe.Client(2, {'symbol' : 'IBM'});

        var op, b1, b2;
        // b receives two ops from a
        op = a.local('symbol', 'a1', 'update', -1);  // cvt=[[1,0], [0,0]]
        b.remote(op);                                // cvt=[[1,0], [1,0]]
        op = a.local('symbol', 'a2', 'update', -1);  // cvt=[[2,0], [0,0]]
        b.remote(op);                                // cvt=[[2,0], [2,0]]
    
        // b generates two ops
        b1 = b.local('symbol', 'b1', 'update', -1);  // cvt=[[2,0], [2,1]]
        b2 = b.local('symbol', 'b2', 'update', -1);  // cvt=[[2,0], [2,2]]

        // a receives two ops from b
        a.remote(b1);                                // cvt=[[2,1], [2,1]]
        a.remote(b2);                                // cvt=[[2,2], [2,2]]

        // b sends two more ops
        b1 = b.local('symbol', 'b3', 'update', -1);  // cvt=[[2,0], [2,3]]
        b2 = b.local('symbol', 'b4', 'update', -1);  // cvt=[[2,0], [2,4]]

        // c sends first op and a receives
    /*    op = c.local('symbol', 'c1', 'update', -1);
        a.remote(op);
        b.remote(op);
    */
        // b receives one more op from a
        op = a.local('symbol', 'a3', 'update', -1);  // cvt=[[3,2], [2,2]]
        b.remote(op);                                // cvt=[[3,2], [3,4]]

        // b purges
        var mcv = b.purge();

        // b receives one more op from a
        op = a.local('symbol', 'a4', 'update', -1);  // cvt=[[4,2], [2,2]]
        b.remote(op);                                // cvt=[[4,2], [4,4]]
    
        var correctMCV = '[3,2]';
        var correctState = {symbol : 'a4'};
        equals(mcv.toString(), correctMCV, 'minimum context vector check');
        deepEqual(a.state, correctState, 'client state check');
        deepEqual(b.state, correctState, 'client state check');
        equals(a.eng.getBufferSize(), 6);
        equals(b.eng.getBufferSize(), 4);
    });

    test('garbage collection #5', 7, function() {
        var a = new util.OpEngClient(0, {symbol : '0'});
        var b = new util.OpEngClient(1, {symbol : '0'});
        var op;

        // b receives an op from a
        op = a.local('symbol', 'a1', 'update', -1);
        b.remote(op);

        // b sends two ops
        b1 = b.local('symbol', 'b1', 'update', -1);
        b2 = b.local('symbol', 'b2', 'update', -1);
    
        // b receives an op from a
        op = a.local('symbol', 'a2', 'update', -1);
        b.remote(op);
    
        // b sends four ops
        b3 = b.local('symbol', 'b3', 'update', -1);
        b4 = b.local('symbol', 'b4', 'update', -1);
        b5 = b.local('symbol', 'b5', 'update', -1);
        b6 = b.local('symbol', 'b6', 'update', -1);

        // b receives an op from a
        op = a.local('symbol', 'a3', 'update', -1);
        b.remote(op);

        // b sends two ops
        b7 = b.local('symbol', 'b7', 'update', -1);
        b8 = b.local('symbol', 'b8', 'update', -1);

        // b receives an op from a
        op = a.local('symbol', 'a4', 'update', -1);
        b.remote(op);

        // a receives four ops
        a.remote(b1);
        a.remote(b2);
        a.remote(b3);
        a.remote(b4);

        // b receives 2 ops from a
        op = a.local('symbol', 'a5', 'update', -1);
        b.remote(op);
        op = a.local('symbol', 'a6', 'update', -1);
        b.remote(op);

        // b sends two ops
        b9 = b.local('symbol', 'b9', 'update', -1);
        b10 = b.local('symbol', 'b10', 'update', -1);

        // a receives two ops
        a.remote(b5);
        a.remote(b6);

        // b receives two ops
        op = a.local('symbol', 'a7', 'update', -1);
        b.remote(op);
        op = a.local('symbol', 'a8', 'update', -1);
        b.remote(op);

        // b sends two ops
        b11 = b.local('symbol', 'b11', 'update', -1);
        b12 = b.local('symbol', 'b12', 'update', -1);    

        // b purges
        var mcv = b.purge();
        equals(mcv.toString(), '[8,6]', 'minimum context vector check');

        // b receives one more op from a
        op = a.local('symbol', 'a9', 'update', -1);
        b.remote(op);

        a.remote(b7);
        a.remote(b8);
        a.remote(b9);
        a.remote(b10);
        a.remote(b11);
        a.remote(b12);
        b.syncWith(a);

        mcv = b.purge();
        equals(mcv.toString(), '[9,12]', 'minimum context vector check');

        mcv = a.purge();
        equals(mcv.toString(), '[8,12]', 'minimum context vector check');

        // b receives one more op from a
        op = a.local('symbol', 'a10', 'update', -1);
        b.remote(op);

        var correctState = {symbol : 'a10'};
        deepEqual(a.state, correctState, 'client state check');
        deepEqual(b.state, correctState, 'client state check');
        equals(a.eng.getBufferSize(), 21);
        equals(b.eng.getBufferSize(), 1);
    });
});