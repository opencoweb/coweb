//
// Mock coweb server for testing.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
dojo.provide('tests.MockCoweb');
dojo.require('coweb.topics');
dojo.require('tests.MockBayeux');

dojo.declare('tests.MockCoweb', tests.MockBayeux, {
    bayeuxUrl : '/session/12345',
    adminUrl : '/admin',
    loginUrl : '/login',
    logoutUrl : '/logout',
    constructor: function(args) {
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
            {topic : coweb.SET_STATE+'widget1', value : 'value1'},
            {topic : coweb.SET_STATE+'widget2', value : 'value2'}
        ];
        this.joinTopics = [
            '/session/roster/*', 
            '/session/sync', 
            '/service/session/join/*'
        ];
        this.updaterTopics = [
            '/service/session/updater'
        ];
    },
    
    onRequest: function(server, req, respDef) {
        var ioArgs = req.ioArgs;
        var url = ioArgs.url;
        var meth = null;
        var map = {}
        map[this.adminUrl] = this.onPrepareRequest;
        map[this.loginUrl] = this.onLoginRequest;
        map[this.logoutUrl] = this.onLogoutRequest;
        var meth = map[url];
        if(meth) {
            meth(server, req, respDef);
        } else {
            this.inherited(arguments);
        }
    },
    
    onPrepareRequest: function(server, req, respDef) {
        // default responds to prep request with success
        respDef.callback(server.prepResp);
    },
    
    onLoginRequest: function(server, req, respDef) {
        var data = dojo.fromJson(req.ioArgs.args.postData);
        if(data.username == server.username && data.password == server.password) {
            respDef.callback(server.loginResp);
        } else {
            throw new Error(403);
        }
    },
    
    onLogoutRequest: function(server, req, resp) {
        
    },

    onMetaSubscribe: function(server, msg, resp) {
        if(msg.subscription == this.joinTopics[this.joinTopics.length-1]) {
            // send back site id, roster, state
            this.sendSiteId(4);
            this.sendFullRoster(server.fullRoster);
            this.sendState(server.fullState);
        }
    },

    sendSiteId: function(i) {
        var msg = dojo.clone(this.publishEnvelope);
        msg.channel = '/service/session/join/siteid';
        msg.data = Number(i);
        this.respond(msg);
    },
    
    sendFullRoster: function(roster) {
        var msg = dojo.clone(this.publishEnvelope);
        msg.channel = '/service/session/join/roster';
        msg.data = roster || {};
        this.respond(msg);
    },
    
    sendState: function(state) {
        var msg = dojo.clone(this.publishEnvelope);
        msg.channel = '/service/session/join/state';
        msg.data = state || [];
        this.respond(msg);
    },
    
    sendRosterAdd: function(siteId, username) {
        var msg = dojo.clone(this.publishEnvelope);
        msg.channel = '/session/roster/available';
        msg.data = {siteId : username};
        this.respond(msg);
    },

    sendRosterRemove: function(siteId, username) {
        var msg = dojo.clone(this.publishEnvelope);
        msg.channel = '/session/roster/unavailable';
        msg.data = {siteId : username};
        this.respond(msg);
    },
    
    sendSync: function(siteId, topic, eventData) {
        var msg = dojo.clone(this.publishEnvelope);
        msg.channel = '/session/sync';
        msg.data = {
            siteId : site,
            topic: topic,
            eventData: eventData
        };
        this.respond(msg);
    }
});