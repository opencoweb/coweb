//
// Extends the simple loader to support the loading of one or more HTML files
// for different devices, users, etc. based on app logic before preparing a
// session.
//
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
dojo.provide('coweb.ext.loaders.LayoutLoader');
dojo.require('coweb.ext.loaders.SimpleLoader');

dojo.declare('coweb.ext.loaders.LayoutLoader', coweb.ext.loaders.SimpleLoader, {
    // urls of layouts to load
    layoutUrls : null,
    constructor: function() {
        // loaded layouts keyed by their urls
        this.layouts = {};
        // loaded layout count
        this._loadCount = 0;
    },
    
    run: function() {
        // invoke initial extension point
        this.onRun();
        if(this.layoutUrls) {
            // start loading requested layouts
            this.loadLayouts();
        } else if(this.autoPrep) {
            // skip to prep, no layouts to load
            this.prepare();
        }
    },
    
    onLayoutLoaded: function(url, layout) {
        // extension point
    },

    onLayoutFailed: function(url) {
        // extension point
    },

    onLayoutsLoaded: function(layouts) {
        // extension point
    },

    loadLayouts: function() {
        var load = dojo.hitch(this, '_onLayoutLoaded');
        var error = dojo.hitch(this, '_onLayoutError');
        // make sure we're an array
        this.layoutUrls = [].concat(this.layoutUrls);
        dojo.forEach(this.layoutUrls, function(url) {
            dojo.xhrGet({url : url.toString(), load: load, error: error});
        }, this);
    },
    
    _onLayoutLoaded: function(layout, ioArgs) {
        var url = ioArgs.args.url;
        this.layouts[url] = layout; 
        this._loadCount += 1;
        try {
            this.onLayoutLoaded(url, layout);
        } catch(e) {
            console.error(e.message);
        }
        if(this._loadCount == this.layoutUrls.length) {
            try {
                this.onLayoutsLoaded(this.layouts);
            } catch(e) {
                console.error(e.message);
            }
            if(this.autoPrepare) {
                // now kick off the session sequence
                this.prepare();
            }
        }
    },
    
    _onLayoutError: function(err, ioArgs) {
        this.onLayoutFailed(ioArgs.args.url);
    }
});