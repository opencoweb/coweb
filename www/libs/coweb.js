//
// Cooperative web package root.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
define([
    'coweb/topics',
    (typeof cowebConfig === 'undefined') ? 'coweb/session/bayeux' : (cowebConfig.sessionImpl || 'coweb/session/bayeux'),
    (typeof cowebConfig === 'undefined') ? 'coweb/listener/unmanaged' : (cowebConfig.listenerImpl || 'coweb/listener/unmanaged'),
    (typeof cowebConfig === 'undefined') ? 'coweb/collab/unmanaged' : (cowebConfig.collabImpl || 'coweb/collab/unmanaged')
], function(topics, session, listener, collab) {
    // build default config options
    var cfg = {
        debug : false,
        adminUrl : '/admin',
        loginUrl : '/login',
        logoutUrl : '/logout'
    };
    // mix in any defined config options
    if(typeof cowebConfig !== 'undefined') {
        dojo.mixin(cfg, cowebConfig);
    }
    // session and listener instance singletons
    var sessionInst = null;
    var listenerInst = null;
    
    // factory interface
    return {
        VERSION : '0.3',
        initSession : function() {
            if(sessionInst) {
                // return singleton session instance
                return sessionInst;
            }
            // create the session instance
            sessionInst = new session();
            // create the listener instance
            listenerInst = new listener();
            // initialize the listener
            listenerInst.init({session : sessionInst});
            // initialize the session
            sessionInst.init(cfg, listenerInst);
            return sessionInst;
        },

        initCollab: function(params) {
            var params = params || {};
            var collabInst = new collab();
            collabInst.init(params)
            return collabInst;
        }
    };

});