//
// Tests for simple 1v1 integration transforms.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
dojo.provide('tests.test_openg_trans');
dojo.require('tests.util');

module('op engine transforms', {
    teardown: function() {
        // clean up all clients
        tests.util.OpEngClient.all_clients = [];
    }
});

test('update and update', 0, function() {
    var a = new tests.util.OpEngClient(0, {symbol : 'ab'});
    var b = new tests.util.OpEngClient(1, {symbol : 'ab'});
    var op;
    
    // non-conflicting
    op = a.local('symbol', 'A', 'update', 1);
    a.send(op);
    op = b.local('symbol', 'B', 'update', 0);
    b.send(op);
    
    equals(a.state.symbol, 'aA');
    equals(b.state.symbol, 'Bb');
    
    // conflicting
    op = a.local('symbol', 'C', 'update', 0);
    a.send(op);
    op = b.local('symbol', 'D', 'update', 1);
    b.send(op);
    
    equals(a.state.symbol, 'CA');
    equals(b.state.symbol, 'BD');

    a.recvAll();
    b.recvAll();

    equals(a.state.symbol, 'CA');
    equals(b.state.symbol, 'CA');    
});

test('update and insert', 0, function() {
    var a = new tests.util.OpEngClient(0, {symbol : 'ab'});
    var b = new tests.util.OpEngClient(1, {symbol : 'ab'});
    var op;

    // non-conflicting
    op = a.local('symbol', 'A', 'insert', 1);
    a.send(op);
    op = b.local('symbol', 'B', 'update', 0);
    b.send(op);

    equals(a.state.symbol, 'aAb');
    equals(b.state.symbol, 'Bb');
    
    // conflicting
    op = a.local('symbol', 'C', 'update', 2);
    a.send(op);
    op = b.local('symbol', 'D', 'insert', 0);
    b.send(op);
    
    equals(a.state.symbol, 'aAC');
    equals(b.state.symbol, 'DBb');
    
    a.recvAll();
    b.recvAll();

    equals(a.state.symbol, 'DBAC');
    equals(b.state.symbol, 'DBAC');    
});

test('update and delete', 0, function() {
    var a = new tests.util.OpEngClient(0, {symbol : 'ab'});
    var b = new tests.util.OpEngClient(1, {symbol : 'ab'});
    var op;

    // non-conflicting
    op = a.local('symbol', null, 'delete', 1);
    a.send(op);
    op = b.local('symbol', 'B', 'update', 0);
    b.send(op);

    equals(a.state.symbol, 'a');
    equals(b.state.symbol, 'Bb');
        
    // conflicting
    op = a.local('symbol', 'C', 'update', 0);
    a.send(op);
    op = b.local('symbol', null, 'delete', 0);
    b.send(op);
    
    equals(a.state.symbol, 'C');
    equals(b.state.symbol, 'b');
    
    a.recvAll();
    b.recvAll();

    equals(a.state.symbol, '');
    equals(b.state.symbol, '');    
});

test('insert and insert', 0, function() {
    var a = new tests.util.OpEngClient(0, {symbol : 'ab'});
    var b = new tests.util.OpEngClient(1, {symbol : 'ab'});
    var op;

    op = a.local('symbol', 'A', 'insert', 1);
    a.send(op);
    op = b.local('symbol', 'B', 'insert', 0);
    b.send(op);

    equals(a.state.symbol, 'aAb');
    equals(b.state.symbol, 'Bab');
    
    // conflicting
    op = a.local('symbol', 'C', 'insert', 1);
    a.send(op);
    op = b.local('symbol', 'D', 'insert', 1);
    b.send(op);
    
    equals(a.state.symbol, 'aCAb');
    equals(b.state.symbol, 'BDab');
    
    a.recvAll();
    b.recvAll();

    equals(a.state.symbol, 'BDaCAb');
    equals(b.state.symbol, 'BDaCAb'); 
});

test('insert and delete', 0, function() {
    var a = new tests.util.OpEngClient(0, {symbol : 'ab'});
    var b = new tests.util.OpEngClient(1, {symbol : 'ab'});
    var op;

    op = a.local('symbol', 'A', 'insert', 1);
    a.send(op);
    op = b.local('symbol', null, 'delete', 0);
    b.send(op);

    equals(a.state.symbol, 'aAb');
    equals(b.state.symbol, 'b');
    
    op = a.local('symbol', null, 'delete', 0);
    a.send(op);
    op = b.local('symbol', 'D', 'insert', 1);
    b.send(op);
    
    equals(a.state.symbol, 'Ab');
    equals(b.state.symbol, 'bD');
    
    a.recvAll();
    b.recvAll();

    equals(a.state.symbol, 'AbD');
    equals(b.state.symbol, 'AbD'); 
});

test('delete and delete', 0, function() {
    var a = new tests.util.OpEngClient(0, {symbol : 'abcd'});
    var b = new tests.util.OpEngClient(1, {symbol : 'abcd'});
    var op;

    op = a.local('symbol', null, 'delete', 0);
    a.send(op);
    op = b.local('symbol', null, 'delete', 2);
    b.send(op);

    equals(a.state.symbol, 'bcd');
    equals(b.state.symbol, 'abd');
    
    op = a.local('symbol', null, 'delete', 1);
    a.send(op);
    op = b.local('symbol', null, 'delete', 1);
    b.send(op);
    
    equals(a.state.symbol, 'bd');
    equals(b.state.symbol, 'ad');

    op = a.local('symbol', null, 'delete', 0);
    a.send(op);
    op = b.local('symbol', null, 'delete', 0);
    b.send(op);
    
    equals(a.state.symbol, 'd');
    equals(b.state.symbol, 'd');
    
    a.recvAll();
    b.recvAll();

    equals(a.state.symbol, 'd');
    equals(b.state.symbol, 'd'); 
});