//
// Cooperative web package root.
//
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
dojo.provide('coweb');
dojo.require('coweb.topics');

// version of the framework
coweb.VERSION = '0.1';

/**
 * Session factory.
 *
 * @param params Object with properties configuring the session instance.
 *   The supported properties are listed below.
 *
 *   debug: True to enable debugging features. If undefined, the presence of 
 *      param cowebdebug=true in the URL is used in place of this flag.
 *   sessionImpl: Package and class name of the session implementation 
 *     under coweb.session to use as a dotted string. If undefined, the
 *     session factory determines the best implementation available for the
 *     browser and platform.
 *   listenerImpl: Package and class name of the Hub listener implementation 
 *     under coweb.listener to use as a dotted string. If undefined, the
 *     listener factory determines the best implementation available for the
 *     browser and platform.
 *   adminUrl: String absolute URL where the admin lookup service is located.
 *     Defaults to /admin.
 *   loginUrl: String absolute URL where the login endpoint is located.
 *     Defaults to /login.
 *   logoutUrl: String absolute URL where the logout endpoint is located.
 *     Defaults to /logout. 
 */
coweb.initSession = function(params) {
    dojo.require('coweb.session');
    dojo.require('coweb.listener');

    if(!params) {params = {};}
    if(typeof params.debug == 'undefined') {
        var url_params = dojo.queryToObject(window.location.search.substring(1));
        params.debug = (url_params.cowebdebug == 'true');
    }
    if(typeof params.adminUrl == 'undefined') {
        params.adminUrl = '/admin';
    }
    if(typeof params.loginUrl == 'undefined') {
        params.loginUrl = '/login';
    }
    if(typeof params.logoutUrl == 'undefined') {
        params.logoutUrl = '/logout';
    }
    // create the session for the appropriate client (plugin, ext, fat, etc.)
    // or the one explicitly named in the params
    var session = coweb.session.create(params.sessionImpl);
    // create the listener for the appropriate transport (hub 1.0, hub 2.0, 
    // etc.)
    params.listener = new coweb.listener.create();
    // initialize the listener
    params.listener.init({session : session});
    // initialize the session
    session.init(params);
    return session;
};

/**
 * Collaboration factory.
 *
 * @param params Object with properties configuring the wrapper instance.
 *   The common, supported properties are listed below.
 *
 *   id: String ID unique to the created instance
 *   wrapperImpl: Package and class name of the collab wrapper implementation 
 *     under coweb.collab to use as a dotted string. If undefined, the
 *     collab factory determines the best implementation available for the
 *     browser and platform.
 *
 *   Wrapper implementations may require or support other parameters. See
 *   the collab API documentation for details.
 */
coweb.initCollab = function(params) {
   dojo.require('coweb.collab');
   if(!params) {params = {};}
   // create the wrapper for the appropriate hub version or use the one 
   // explicitly named in the params
   var wrapper = coweb.collab.create(params.wrapperImpl);
   // initialize the wrapper
   wrapper.init(params);
   return wrapper;
};