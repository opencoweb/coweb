//
// Tests the Promise class.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
//
define([
    'coweb/util/Promise'
], function(Promise) {
    module('promise', {
        setup: function() {
            this.p = new Promise();
        }
    });
    
    test('single resolve', 2, function() {
        this.p.resolve();
        raises(this.p.resolve);
        raises(this.p.fail);
    });

    test('single fail', 2, function() {
        this.p.fail();
        raises(this.p.resolve);
        raises(this.p.fail);
    });

    test('resolve chain', 5, function() {
        var target = {a : 'a', b : 'b'};
        this.p.then(function(val) {
            deepEqual(val, target);
            return 'ignored';
        });
        this.p.then(function(val) {
            deepEqual(val, target);
            return new Error('ignored');
        });
        this.p.then(function(val) {
            deepEqual(val, target);
            throw new Error('ignored');
        });
        this.p.then(function(val) {
            equal(val, target);
        });                
        this.p.resolve(target);
        this.p.then(function(val) {
            equal(val, target);
        });
    });
    
    test('fail chain', 8, function() {
        var target = new Error(),
            chainVal = 'ignored',
            chainErr = new Error('ignored');

        this.p.then(null, function(err) {
            equal(err, target);
            return 'ignored';
        }).then(function(val) {
            equal(val, chainVal);
        });
                
        this.p.then(null, function(err) {
            equal(err, target);
            return chainErr;
        }).then(null, function(err) {
            equal(err, chainErr);
        });
        
        this.p.then(null, function(err) {
            equal(err, target);
            throw new Error('ignored');
        }).then(null, function(err) {
            equal(err, chainErr);
        });
        
        this.p.then(null, function(err) {
            equal(err, target);
        }).then(function() {
            // @todo: what?
        });
        
        this.p.fail(target);
        this.p.then(null, function(err) {
            equal(err, target);
        }).then(function() {
            // @todo: what?
        });
    });
});
