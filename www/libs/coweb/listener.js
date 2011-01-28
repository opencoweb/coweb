//
// Listener interface factory.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
dojo.provide('coweb.listener');

/**
 * Factory function to create an event listener based on the available
 * in-page transport layer (e.g., OpenAjax Unmanaged Hub, Managed Hub, etc.).
 * 
 * @param id Package and class name of the specific wrapper implementation 
 *   under coweb.listener to use as a dotted string
 */
coweb.listener.create = function(id) {
    var listener = null;
    if(id) {
        // if the caller gave a specific id for the collab package and class, 
        // try to use it
        var segs = id.split('.');
        var cls = segs.pop();
        // try to load the package
        var pkg = 'coweb.listener.'+segs.join('.');
        dojo['require'](pkg);
        // locate the deepest namespace
        var obj = coweb.listener;
        for(var i=0; i < segs.length; i++) {
            obj = obj[segs[i]];
        }
        // try to instantiate the class
        listener = new obj[cls]();
    } else {
        var version;
        try {
            version = OpenAjax.hub.implVersion;
        } catch(e) {
            // throw an error; need Hub for all of our implementations
            throw new Error('OpenAjax Hub 1.0 required but not available');
        }
        if(version == '1.0' || version == '0.6') {
            // use unmanaged hub listener
            dojo.require('coweb.listener.unmanaged');
            listener = new coweb.listener.unmanaged.UnmanagedHubListener();
        } else {
            // throw an error for now ...
            throw new Error('collab listener implementation unavailable');            
        }
    }
    return listener;
};
