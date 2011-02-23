//
// Tests the Promise class.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
//
/*global define module test raises equal deepEqual*/
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

    test('resolve listeners', 10, function() {
        var target = {a : 'a', b : 'b'},
            chainVal = 'ignored',
            chainErr = new Error('ignored');

        this.p.then(function(val) {
            deepEqual(val, target);
            return chainVal;
        }).then(function(val) {
            equal(val, chainVal);
        });
        
        this.p.then(function(val) {
            deepEqual(val, target);
            return chainErr;
        }).then(null, function(err) {
            equal(err, chainErr);
        });
        
        this.p.then(function(val) {
            deepEqual(val, target);
            throw chainErr;
        }).then(null, function(err) {
            equal(err, chainErr);            
        });
        
        this.p.then(function(val) {
            equal(val, target);
        }).then(function(val) {
            deepEqual(val, target);
        });
        
        this.p.resolve(target);
        this.p.then(function(val) {
            equal(val, target);
        }).then(function(val) {
            deepEqual(val, target);
        });
    });

    test('fail listeners', 10, function() {
        var target = new Error('target error'),
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
            throw chainErr;
        }).then(null, function(err) {
            equal(err, chainErr);
        });
        
        this.p.then(null, function(err) {
            equal(err, target);
        }).then(function(val) {
           equal(val, target);
        });
        
        this.p.fail(target);
        this.p.then(null, function(err) {
            equal(err, target);
        }).then(function(val) {
           equal(val, target);
        });
    });
    
    test('promise chain', 6, function() {
        var target = {a : 'a', b : 'b'},
            chainSuccessPromise = new Promise(),
            chainTarget = {c : 'c', d : 'd'},
            chainFailurePromise = new Promise(),
            chainErr = new Error('promise error');
        
        this.p.then(function(val) {
            deepEqual(val, target);
            return chainSuccessPromise;
        }).then(function(val) {
            deepEqual(val, chainTarget);
        }).then(function(val) {
            deepEqual(val, chainTarget);
            return chainFailurePromise;
        }).then(null, function(err) {
            equal(err, chainErr);
        }).then(function(val) {
            equal(val, chainErr);
        });
        // make sure original chain still works
        this.p.then(function(val) {
            deepEqual(val, target);
        });
        
        this.p.resolve(target);
        chainSuccessPromise.resolve(chainTarget);
        chainFailurePromise.fail(chainErr);
    });
    
    test('context', 6, function() {
        var target = {a : 'a', b : 'b'},
            chainSuccessPromise = new Promise(),
            chainTarget = {c : 'c', d : 'd'},
            obj = {
                sentinel : 'sentinel',
                callback : function(val) {
                    equal(this.sentinel, 'sentinel');
                    deepEqual(val, target);
                    return chainSuccessPromise;
                },
                chainCallback : function(val) {
                    equal(this.sentinel, 'sentinel');
                    deepEqual(val, chainTarget);                    
                },
                errback : function(err) {
                    equal(this.sentinel, 'sentinel');
                }
            };
        
        this.p.then('callback', null, obj).then('chainCallback', null, obj);
        this.p.then(obj.callback, null, obj);
        this.p.resolve(target);
        chainSuccessPromise.resolve(chainTarget);
    });
});