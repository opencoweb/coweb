//
// Mock coweb server for testing.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
define([
    'coweb/topics',
    'mock/BayeuxServer',
    'coweb/util/lang'
], function(topics, BayeuxServer, lang) {
    var CowebServer = function() {
        BayeuxServer.call(this);
        
        this.bayeuxUrl = '/session/12345';
        this.adminUrl = '/admin';
        this.loginUrl = '/login';
        this.logoutUrl = '/logout';
        this.username = 'john.doe';
        this.password = 'mypass';
        this.prepResp = {
            sessionid : '12345',
            sessionurl: this.bayeuxUrl,
            key: null,
            collab: null,
            info: {
                title : 'session title',
                description : 'session description'
            },
            username : this.username
        };
        this.fullRoster = {
            1 : 'person1',
            2 : 'person2',
            3 : 'person3'
        };
        this.fullState = [
            {topic : topics.SET_STATE+'widget1', value : 'value1'},
            {topic : topics.SET_STATE+'widget2', value : 'value2'}
        ];
        this.joinTopics = [
            '/session/roster/*', 
            '/session/sync', 
            '/service/session/join/*'
        ];
        this.updaterTopics = [
            '/service/session/updater'
        ];
    };
    CowebServer.prototype = new BayeuxServer();
    CowebServer.prototype.constructor = CowebServer;
    var proto = CowebServer.prototype;
    
    proto.onRequest = function(server, req, resp) {
        var url = req.args.url;
        var meth = null;
        var map = {};
        map[this.adminUrl] = this.onPrepareRequest;
        map[this.loginUrl] = this.onLoginRequest;
        map[this.logoutUrl] = this.onLogoutRequest;
        var meth = map[url];
        if(meth) {
            meth(server, req, resp);
        } else {
            BayeuxServer.onRequest.apply(this, arguments);
        }
    };
    
    proto.onPrepareRequest = function(server, req, resp) {
        // default responds to prep request with success
        resp.callback(server.prepResp);
    };
    
    proto.onLoginRequest = function(server, req, resp) {
        var data = JSON.parse(req.args.body);
        if(data.username == server.username && data.password == server.password) {
            resp.resolve(server.loginResp);
        } else {
            throw new Error(403);
        }
    };
    
    proto.onLogoutRequest = function(server, req, resp) {
        
    };

    proto.onMetaSubscribe = function(server, msg, resp) {
        if(msg.subscription == this.joinTopics[this.joinTopics.length-1]) {
            // send back site id, roster, state
            this.sendSiteId(4);
            this.sendFullRoster(server.fullRoster);
            this.sendState(server.fullState);
        }
    };

    proto.sendSiteId = function(i) {
        var msg = lang.clone(this.publishEnvelope);
        msg.channel = '/service/session/join/siteid';
        msg.data = Number(i);
        this.respond(msg);
    };
    
    proto.sendFullRoster = function(roster) {
        var msg = lang.clone(this.publishEnvelope);
        msg.channel = '/service/session/join/roster';
        msg.data = roster || {};
        this.respond(msg);
    };
    
    proto.sendState = function(state) {
        var msg = lang.clone(this.publishEnvelope);
        msg.channel = '/service/session/join/state';
        msg.data = state || [];
        this.respond(msg);
    };
    
    proto.sendRosterAdd = function(siteId, username) {
        var msg = lang.clone(this.publishEnvelope);
        msg.channel = '/session/roster/available';
        msg.data = {siteId : username};
        this.respond(msg);
    };

    proto.sendRosterRemove = function(siteId, username) {
        var msg = lang.clone(this.publishEnvelope);
        msg.channel = '/session/roster/unavailable';
        msg.data = {siteId : username};
        this.respond(msg);
    };
    
    proto.sendSync = function(siteId, topic, eventData) {
        var msg = lang.clone(this.publishEnvelope);
        msg.channel = '/session/sync';
        msg.data = {
            siteId : site,
            topic: topic,
            eventData: eventData
        };
        this.respond(msg);
    };
    
    return CowebServer;
});