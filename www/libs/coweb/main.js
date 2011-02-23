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
    adminUrl : cowebConfig.adminUrl || '/admin',
    loginUrl : cowebConfig.loginUrl || '/login',
    logoutUrl : cowebConfig.logoutUrl || '/logout'    
};

// @todo: is this build tool friendly?
define([
    'coweb/topics',
    cowebConfig.sessionImpl,
    cowebConfig.listenerImpl,
    cowebConfig.collabImpl
], function(topics, SessionImpl, ListenerImpl, CollabImpl) {
    // session and listener instance singletons
    var sessionInst = null,
        listenerInst = null;

    // factory interface
    return {
        VERSION : '0.3',
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

        initCollab: function(params) {
            params = params || {};
            var collabInst = new CollabImpl();
            collabInst.init(params);
            return collabInst;
        }
    };

});