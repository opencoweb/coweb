//
// Mock REST server for testing.
//
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
dojo.provide('tests.MockXhr');

dojo.mixin(tests.MockXhr, {
    _hooks : {
        xhrPost : null,
        rawXhrPost : null,
        xhrGet : null,
        rawXhrGet: null
    },
    _hooked : false,
    _servers : {},
    
    addServer: function(url, inst) {
        var x = this._servers[url];
        if(x) {
            throw new Error('server already registered at ' + url);
        }
        this._servers[url] = inst;
    },
    
    removeServer: function() {
        var x = this._servers[url];
        if(!x) {
            throw new Error('server not registered at ' + url);
        }
        delete this._servers[url];
    },
    
    clearServers: function() {
        this._servers = {};
    },

    _xhr: function(args) {
        var def = new dojo.Deferred();
        // standard dojo ioargs structure
        var ioArgs = {
            args : args,
            handleAs : args.handleAs || 'text',
            query : args.query || '',
            url : args.url || '',
            xhr : {
                status : 0,
                statusText : 'simulated status response',
                responseText : 'simulated status response'
            },
        };
        def.ioArgs = ioArgs;
        if(args.error) {
            def.addErrback(dojo.hitch(this, '_error', ioArgs));
        }
        if(args.load) {
            def.addCallback(dojo.hitch(this, '_load', ioArgs));
        }
        
        // send to server instance
        this._sendToServer(def);
        return def;
    },
    
    _error: function(ioArgs, err) {
        ioArgs.args.error(err, ioArgs);
    },
    
    _load: function(ioArgs, resp) {
        ioArgs.args.load(resp, ioArgs);
    },
    
    _sendToServer: function(req) {
        var server = this._servers[req.ioArgs.url];
        if(server) {
            server.queue(req);
        } else {
            console.warn('no server registered for', req.ioArgs.url);
        }
    },    
    
    hook: function() {
        if(this._hooked) {
            throw new Error('already hooked dojo.xhr*');
        }
        var name;
        for(name in this._hooks) {
            this._hooks[name] = dojo[name];
            dojo[name] = dojo.hitch(this, this[name]);
        }
        this._hooked = true;
    },
    
    unhook: function() {
        if(!this._hooked) {
            throw new Error('dojo.xhr* not hooked');
        }
        var name;
        for(name in this._hooks) {
            dojo[name] = this._hooks[name];
            this._hooks[name] = null;
        }
        this._hooked = false;
    },
    
    rawXhrGet: function(args) {
        return this._xhr(args);
    },

    rawXhrPost : function(args) {
        return this._xhr(args);
    },
    
    xhrPost: function(args) {
        return this._xhr(args);
    },
    
    xhrGet: function(args) {
        return this._xhr(args);
    },

    abort: function() {
        // @todo: 
        console.warn('aborting mock xhr');
    }
});

dojo.declare('tests.MockXhr.MockServer', null, {
    constructor: function() {
        this._queue = [];
        this._started = false;
        this._iterator = null;
    },
    
    _process: function() {
        var it = this._iterator;
        if(it) {
            this._iterator = null;
            var req = this._queue.pop(0);
            it.then(dojo.hitch(this, '_onRequest'));
            setTimeout(function() { it.callback(req); }, 0);
        }
    },
    
    setStatus: function(req, status) {
        var xhr = req.ioArgs.xhr;
        xhr.status = Number(status);
    },

    queue: function(req) {
        this._queue.push(req);
        this._process();
    },
    
    start: function() {
        if(this._started) {
            throw new Error('server already started');
        }
        this._started = true;
        this._pump();
    },
    
    stop: function() {
        if(!this._started) {
            throw new Error('server not started');
        }
        this._started = false;
        // @todo: clear iterator?
    },
    
    _pump: function() {
        if(this._iterator) {
            return;
        }
        this._iterator = new dojo.Deferred();
        if(this._queue.length && this._started) {
            this._process();
        }
    },
    
    _onRequest: function(req) {
        var respDef = new dojo.Deferred();
        try {
            this.onRequest(this, req, respDef);
        } catch(e) {
            if(isNaN(e.message)) {
                this.setStatus(req, 500);
            } else {
                this.setStatus(req, e.message);
            }
            respDef.errback(e);
        }
        var self = this;
        respDef.then(function(resp) {
            setTimeout(function() { 
                req.callback(resp);
                self._pump();
            }, 0);
        }, function(err) {
            setTimeout(function() { 
                req.errback(err); 
                self._pump();
            }, 0);
        });
        this._pump();
    },

    onRequest: function(server, req, respDef) {
        // extension point
    }
});
