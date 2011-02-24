//
// Mock XHR server for testing.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
define([
    'coweb/util/Promise'
], function(Promise) {
    var Server = function() {
        this._queue = [];
        this._started = false;
        this._iterator = null;
    };
    var proto = Server.prototype;
    
    proto._process = function() {
        var it = this._iterator;
        if(it) {
            this._iterator = null;
            var req = this._queue.pop(0);
            it.then('_onRequest', null, this);
            setTimeout(function() { it.resolve(req); }, 0);
        }
    };

    proto.setStatus = function(req, status) {
        var xhr = req.ioArgs.xhr;
        xhr.status = Number(status);
    };

    proto.queue = function(req) {
        this._queue.push(req);
        this._process();
    };

    proto.start = function() {
        if(this._started) {
            throw new Error('server already started');
        }
        this._started = true;
        this._pump();
    };

    proto.stop = function() {
        if(!this._started) {
            throw new Error('server not started');
        }
        this._started = false;
        // @todo: clear iterator?
    };

    proto._pump = function() {
        if(this._iterator) {
            return;
        }
        this._iterator = new Promise();
        if(this._queue.length && this._started) {
            this._process();
        }
    };

    proto._onRequest = function(req) {
        var resp = new Promise();
        try {
            this.onRequest(this, req, resp);
        } catch(e) {
            if(isNaN(e.message)) {
                this.setStatus(req, 500);
            } else {
                this.setStatus(req, e.message);
            }
            resp.fail(e);
        }
        var self = this;
        resp.then(function(val) {
            setTimeout(function() { 
                req.resolve(val);
                self._pump();
            }, 0);
        }, function(err) {
            setTimeout(function() { 
                req.fail(err); 
                self._pump();
            }, 0);
        });
        this._pump();
    };

    proto.onRequest = function(server, req, resp) {
        // extension point
    };
    
    return Server;
});