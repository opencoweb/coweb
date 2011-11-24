//
// Tests for coweb/util/xhr.
//
// @todo: can reuse for sync or no?
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
/*global define module test equal deepEqual raises stop start ok*/
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
        var args = {
            url : 'target.json',
            method : 'GET'
        };
        stop(this.timeout);
        xhr.send(args).then(function(args) {
            equal(args.xhr.status, 200);
            var result = JSON.parse(args.xhr.responseText);
            deepEqual(result, target);
            start();            
        });
    });
    // 
    // test('POST success', 3, function() {
    //     var args = {
    //         url : 'mock/echo.php',
    //         method : 'POST',
    //         body : JSON.stringify({
    //             key : 123,
    //             collab : true
    //         })
    //     };
    //     stop(this.timeout);
    //     xhr.send(args).then(function(args) {
    //         equal(args.xhr.status, 200);
    //         var result = JSON.parse(args.xhr.responseText);
    //         equal(result.collab, true);
    //         equal(result.key, 123);
    //         start();
    //     });
    // });

    test('POST failure', 1, function() {
        var args = {
            url : 'badtarget',
            method : 'POST',
            body : JSON.stringify(target)
        };
        stop(this.timeout);
        xhr.send(args).then(null, function(args) {
            var status = args.xhr.status;
            ok(status === 404 || status === 405, 'status: '+status);
            start();
        });
    });

    test('abort', 1, function() {
        var args, promise;
        args = {
            url : 'bad.json',
            method : 'GET'
        };
        stop(this.timeout);
        promise = xhr.send(args);
        promise.then(null, function(args) {
            var status;
            try {
                status = args.xhr.status;
            } catch(e) {
                // watch out for IE9 throwing error on dead xhr
                status = 0;
            }
            // might have completed before the abort
            ok(status === 0 || status === 404, 'status: '+status);
            start();
        });
        promise.xhr.abort();
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
            method : 'GET'
        };
        xhr.send(args1).then(function(args) {
            equal(args.xhr.status, 200);
            var result = JSON.parse(args.xhr.responseText);
            deepEqual(result, target);
            done();            
        });
        
        // bad fetch
        args2 = {
            url : 'bad.json',
            method : 'GET'
        };
        xhr.send(args2).then(null, function(args) {
            var status = args.xhr.status;
            equal(status, 404);
            done();
        });    
    });
});