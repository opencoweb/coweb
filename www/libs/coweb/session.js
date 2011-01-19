//
// Session interface factory.
//
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
dojo.provide('coweb.session');

/**
 * Factory function to create a session object for a client based on browser
 * capabilities.
 * 
 * @param id Package and class name of the specific session implementation 
 *   under coweb.session to use as a dotted string
 */
coweb.session.create = function(id) {
    var sess = null;
    if(id) {
        // if the caller gave a specific id for the session package and class, 
        // try to use it
        var segs = id.split('.');
        var cls = segs.pop();
        // try to load the package
        var pkg = 'coweb.session.'+segs.join('.');
        dojo['require'](pkg);
        // locate the deepest namespace
        var obj = coweb.session;
        for(var i=0; i < segs.length; i++) {
            obj = obj[segs[i]];
        }
        // try to instantiate the class
        sess = new obj[cls]();
    } else {
        // use bayeux implementation
        dojo.require('coweb.session.bayeux');
        sess = new coweb.session.bayeux.BayeuxSession();
    }
    return sess;
};
