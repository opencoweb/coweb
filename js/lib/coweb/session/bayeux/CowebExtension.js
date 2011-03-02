//
// Adds coweb session IDs to the ext field of Bayeux messages.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*global define*/
define(function() {
    var CowebExtension = function(args) {
        this._cometd = null;
        this._sessionid = args.sessionid;
    };
    
    CowebExtension.prototype.registered = function(name, cometd) {
        this._cometd = cometd;
    };
    
    CowebExtension.prototype.unregistered = function(name, cometd) {
        this._cometd = null;
    };
    
    CowebExtension.prototype.outgoing = function(msg) {
        var ext = msg.ext = msg.ext || {};
        var coweb = msg.ext.coweb = msg.ext.coweb || {};
        coweb.sessionid = this._sessionid;
        return msg;
    };

    return CowebExtension;
});
