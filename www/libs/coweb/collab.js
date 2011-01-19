//
// Collaboration interface factory.
//
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
dojo.provide('coweb.collab');

/**
 * Factory function to create a collaboration object based on the available
 * in-page transport layer (e.g., OpenAjax Unmanaged Hub, Managed Hub, etc.).
 * 
 * @param id Package and class name of the specific wrapper implementation 
 *   under coweb.collab to use as a dotted string
 */
coweb.collab.create = function(id) {
    var wrapper = null;
    if(id) {
        // if the caller gave a specific id for the collab package and class, 
        // try to use it
        var segs = id.split('.');
        var cls = segs.pop();
        // try to load the package
        var pkg = 'coweb.collab.'+segs.join('.');
        dojo['require'](pkg);
        // locate the deepest namespace
        var obj = coweb.collab;
        for(var i=0; i < segs.length; i++) {
            obj = obj[segs[i]];
        }
        // try to instantiate the class
        wrapper = new obj[cls]();
    } else {
        var version;
        try {
            version = OpenAjax.hub.implVersion;
        } catch(e) {
            // throw an error; need Hub for all of our implementations
            throw new Error('OpenAjax Hub 1.0 required but not available');
        }
        if(version == '1.0' || version == '0.6') {
            // use unmanaged hub wrapper
            dojo.require('coweb.collab.unmanaged');
            wrapper = new coweb.collab.unmanaged.UnmanagedHubCollab();
        } else {
            // throw an error for now ...
            throw new Error('collab wrapper implementation unavailable');            
        }
    }
    return wrapper;
};
