//
// Adds coweb session IDs to the ext field of Bayeux messages.
//
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
dojo.provide('coweb.session.bayeux.CowebExtension');

dojo.declare('coweb.session.bayeux.CowebExtension', null, {
    constructor: function(args) {
        this._cometd = null;
        this._sessionid = args.sessionid;
    },
    
    registered: function(name, cometd) {
        this._cometd = cometd;
    },
    
    unregistered: function() {
        this._cometd = null;
    },

    outgoing: function(message) {
        var coweb = dojo.getObject('ext.coweb', true, message);
        coweb.sessionid = this._sessionid;
        return message;
    }
});