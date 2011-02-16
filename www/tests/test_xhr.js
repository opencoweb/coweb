//
// Tests for coweb/util/xhr.
//
// @todo: can reuse for sync or no?
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
define([
    'coweb/util/xhr'
], function(xhr) {
    var target = {
        "some" : "json",
        "for" : "a",
        "test" : "xhr"
    };

    module('xhr', {
        setup : function() {
            this.timeout = 2000;
        }
    });
    
    test('bad args', 1, function() {
        raises(xhr.send, '');
    });
    
    test('GET success', 2, function() {
        var args;
        args = {
            url : 'target.json',
            method : 'GET',
            onSuccess: function(result) {
                equal(args.xhr.status, 200);
                result = JSON.parse(result);
                deepEqual(result, target);
                start();
            }
        };
        stop(this.timeout);
        xhr.send(args);
    });

    test('GET failure', 1, function() {
        var args;
        args = {
            url : 'bad.json',
            method : 'GET',
            onError: function(err) {
                equal(args.xhr.status, 404);
                start();
            }
        };
        stop(this.timeout);
        req = xhr.send(args);
    });

    test('POST success', 3, function() {
        var args;
        args = {
            url : '/admin',
            method : 'POST',
            body : JSON.stringify({
                key : 123,
                collab : true
            }),
            onSuccess: function(result) {
                equal(args.xhr.status, 200);
                result = JSON.parse(result);
                equal(result.collab, true);
                equal(result.key, 123);
                start();
            }
        };
        stop(this.timeout);
        xhr.send(args);
    });
    
    test('POST failure', 1, function() {
        var args;
        args = {
            url : 'target.json',
            method : 'POST',
            body : JSON.stringify(target),
            onError: function(err) {
                ok(args.xhr.status, 405);
                start();
            }
        };
        stop(this.timeout);
        xhr.send(args);
    });

    test('abort', 1, function() {
        var args, req;
        args = {
            url : 'bad.json',
            method : 'GET',
            onError: function(err) {
                var status = args.xhr.status;
                // might have completed before the abort
                ok(status === 0 || status === 404);
                start();
            }
        };
        stop(this.timeout);
        req = xhr.send(args);
        req.abort();
    });
        
    test('concurrent', 3, function() {
        var args1, args2, count = 2;
        stop(this.timeout);

        var done = function() {
            if(--count === 0) {
                start();
            }
        };

        // good fetch
        args1 = {
            url : 'target.json',
            method : 'GET',
            onSuccess: function(result) {
                equal(args1.xhr.status, 200);
                result = JSON.parse(result);
                deepEqual(result, target);
                done();
            }
        };
        xhr.send(args1);
        
        // bad fetch
        args2 = {
            url : 'bad.json',
            method : 'GET',
            onError: function(err) {
                var status = args2.xhr.status;
                equal(status, 404);
                done();
            }
        };
        xhr.send(args2);        
    });
});