//
// Cooperative web package root.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*jslint white:false, bitwise:true, eqeqeq:true, immed:true, nomen:false, 
  onevar:false, plusplus:false, undef:true, browser:true, devel:true, 
  forin:false, sub:false*/
/*global define cowebConfig*/

define([
    'coweb/session/BayeuxSession',
    'coweb/listener/UnmanagedHubListener',
    'coweb/collab/UnmanagedHubCollab',
    './ConfigInitializer'
], function(SessionImpl, ListenerImpl, CollabImpl, ConfigInitializer) {
    // session and listener instance singletons
    var sessionInst = null,
        listenerInst = null,
        urlNames = ['adminUrl', 'loginUrl', 'logoutUrl'],
        name, value, base, noop, i, l;

    // define a dummy console for error logging if not provided
    if(typeof console === 'undefined') {
        noop = function() {};
        console = {};
        console.error = 
        console.warn = 
        console.log = 
        console.info = 
        console.debug = noop;
    }
    
    if(cowebConfig.baseUrl) {
        // adjust abs urls relative to base
        for(i=0, l=urlNames.length; i<l; i++) {
            name = urlNames[i];
            value = cowebConfig[urlNames[i]];
            if(value.charAt(0) === '/') {
                cowebConfig[name] = cowebConfig.baseUrl + value;
            }
        }
    }

    // factory interface
    return {
        VERSION : '1.0.1-SNAPSHOT',

        /**
         * Get the singleton cowebConfig.sessionImpl implementation of 
         * SessionInterface.
         *
         * @return SessionInterface
         */
        initSession : function() {
            if(sessionInst) {
                // return singleton session instance
                return sessionInst;
            }
            // create the session instance
            sessionInst = ConfigInitializer.sessionImpl ? new ConfigInitializer.sessionImpl() : new SessionImpl();
            // create the listener instance
            listenerInst = ConfigInitializer.listenerImpl ? new ConfigInitializer.listenerImpl() : new ListenerImpl();
            listenerInst.init(sessionInst);
            // initialize the session
            sessionInst.init(cowebConfig, listenerInst);
            return sessionInst;
        },

        /**
         * Get an instance of cowebConfig.collabImpl, the configured 
         * implementation of CollaborationInterface.
         *
         * @param {Object} params Configuration parameters
         */
        initCollab: function(params) {
            params = params || {};
            var collabInst = ConfigInitializer.collabImpl ? new ConfigInitializer.collabImpl() : new CollabImpl();
            collabInst.init(params);
            return collabInst;
        },
        
        /**
         * Destroys the SessionInterface singleton.
         */
        reset: function() {
            if(sessionInst) {
                sessionInst.destroy();
            }
            sessionInst = null;
        }
    };
});
