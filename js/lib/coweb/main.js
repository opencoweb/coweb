//
// Cooperative web package root.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*global define cowebConfig*/
if(typeof cowebConfig === 'undefined') {
    var cowebConfig = {};
}

// mix defaults into coweb config where left undefined
cowebConfig = {
    sessionImpl : cowebConfig.sessionImpl || 'coweb/session/BayeuxSession',
    listenerImpl : cowebConfig.listenerImpl || 'coweb/listener/UnmanagedHubListener',
    collabImpl : cowebConfig.collabImpl || 'coweb/collab/UnmanagedHubCollab',
    debug : cowebConfig.debug || false,
    baseUrl : cowebConfig.baseUrl || '',
    adminUrl : cowebConfig.adminUrl || '/admin',
    loginUrl : cowebConfig.loginUrl || '/login',
    logoutUrl : cowebConfig.logoutUrl || '/logout',
    cacheState : cowebConfig.cacheState || false
};

define([
    cowebConfig.sessionImpl,
    cowebConfig.listenerImpl,
    cowebConfig.collabImpl
], function(SessionImpl, ListenerImpl, CollabImpl) {
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
        VERSION : '0.6',

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
            sessionInst = new SessionImpl();
            // create the listener instance
            listenerInst = new ListenerImpl();
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
            var collabInst = new CollabImpl();
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