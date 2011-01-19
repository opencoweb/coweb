//
// Cooperative map app.
//
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
dojo.require('comap.GMap');
dojo.require('comap.ChatBox');
dojo.require('dijit.layout.BorderContainer');
dojo.require('dijit.layout.AccordionContainer');
dojo.require('dijit.layout.AccordionPane');
dojo.require('dijit.Toolbar');
dojo.require('dijit.form.Button');
dojo.require('dijit.form.CheckBox');
dojo.require('dojo.hash');
dojo.require('coweb');
dojo.require('coweb.ext.attendance');
dojo.require('coweb.ext.loaders.SimpleLoader');
dojo.requireLocalization('comap', 'comap');

// have to wrap class decl in ready when using dojo xd loader
dojo.ready(function() {

dojo.declare('comap.App', coweb.ext.loaders.SimpleLoader, {
    // look at extra param stuff in djConfig for where coweb admin is
    // located; did this just to make app easily portable to other paths    
    adminUrl : djConfig.cowebAdminUrl,
    onRun: function() {
        // track dynamic connect tokens
        this.contTok = null;
        
        // quick and dirty i18n
        var body = dojo.body();
        this.labels = dojo.i18n.getLocalization('comap', 'comap');
        var html = dojo.replace(body.innerHTML, this.labels);
        body.innerHTML = html;

        // make visible and parse for widgets now
        dojo.style(body, 'display', '');
        dojo.parser.parse();
        
        // grab widgets
        this.map = dijit.byId('map');
        this.chat = dijit.byId('chat');
        this.log = dijit.byId('log');
        
        this.map.attr('markerTemplate', dojo.cache('comap.nls', 'marker.html'));

        // hand widgets refs to this controller
        this.map.attr('app', this);
        this.chat.attr('app', this);
        
        // deal with initial hash
        var hash = dojo.hash();
        if(hash) {
            this.onHashChange(hash);
        }
        // listen to hash changes
        dojo.subscribe('/dojo/hashchange', this, 'onHashChange');
        
        // listen for local events
        dojo.connect(dijit.byId('syncButton'), 'onClick', this, 'onMapSyncClick');
        dojo.connect(dijit.byId('syncBox'), 'onChange', this, 'onMapContinuousSyncClick');
        dojo.connect(this.chat, 'onMessage', this, 'onChatMessage');
        dojo.connect(this.map, 'onMarkerAdded', this, 'onMapMarkerAdded');
        dojo.connect(this.map, 'onMarkerMoved', this, 'onMapMarkerMoved');
        dojo.connect(this.map, 'onMarkerAnimated', this, 'onMapMarkerAnimated');

        // listen to remote events
        this.collab.subscribeStateRequest(this, 'onStateRequest');
        this.collab.subscribeStateResponse(this, 'onStateResponse');
        this.collab.subscribeSync('chat.message', this, 'onRemoteChatMessage');
        this.collab.subscribeSync('log.message', this, 'onRemoteLogMessage');
        this.collab.subscribeSync('marker.add.*', this, 'onRemoteMapMarkerAdded');
        this.collab.subscribeSync('marker.move.*', this, 'onRemoteMapMarkerMoved');
        this.collab.subscribeSync('marker.anim.*', this, 'onRemoteMapMarkerAnimated');
        this.collab.subscribeSync('map.viewport', this, 'onRemoteMapViewport');
        
        // track attendance for usernames
        this.attend = coweb.ext.attendance;
        
        // avoid a splitter layout bug by forcing a resize after load
        dijit.byId('layout').resize();
    },
    
    onHashChange: function(hash) {
        try {
            var latLng = this.map.latLngFromString(hash);
        } catch(e) {
            // ignore bad lat/lng hash
            return;
        }
        this.map.setCenter(latLng);
    },
    
    onStateRequest: function(token) {
        var state = {
            logHtml : this.log.getHtml(),
            chatHtml : this.chat.getHtml(),
            markers : this.map.getAllMarkers(),
            // not necessary to do viewport, but gets user looking somewhere
            // relevant to one other user at least
            viewport : {
                zoom : this.map.getZoom(),
                center : this.map.getCenter().toUrlValue(),
                type : this.map.getMapType()
            }
        };
        this.collab.sendStateResponse(state, token);
    },
    
    onStateResponse: function(state) {
        this.map.setAllMarkers(state.markers);
        this.chat.setHtml(state.chatHtml);
        this.log.setHtml(state.logHtml);
        this.onRemoteMapViewport(null, state.viewport);
    },
    
    onCollabReady: function(info) {
        // store username for use by widgets
        this.username = info.username;
        // subscribe to zip data from bots
        this.collab.subscribeService('zipvisits', this, 'onZipVisits');
    },
    
    onZipVisits: function(counts, error) {
        if(error) {
            console.error('could not subscribe to zipvisits service');
            return;
        }
        for(var uuid in counts) {
            var marker = this.map.getMarkerById(uuid);
            marker._visitCount = counts[uuid];
        }
        // refresh the current info popup
        this.map.refreshInfoPop();
    },
        
    onChatMessage: function(text, pos, isoDT) {
        var value = {text : text, isoDT : isoDT};
        // send raw value, will be parsed / sanitized on the other side
        this.collab.sendSync('chat.message', value, 'insert', pos);
    },

    onRemoteChatMessage : function(topic, value, type, pos, site) {
        var username = this.attend.getUserAtSite(site).username;
        // sanitize received text
        value.text = this.chat.sanitizeText(value.text);
        // parse for http links
        value.text = this.chat.parseLinks(value.text);
        this.chat.insertMessage(username, value.text, value.isoDT, pos);
    },
    
    _insertLogMessage: function(args) {
        // make sure latlng isn't bogus
        var latLng = this.log.sanitizeText(args.latLng);
        var text = dojo.replace(this.labels[args.template], [latLng]);
        var rv = this.log.insertMessage(args.username, text, args.isoDT, 
            args.pos);
        args.isoDT = rv.isoDT;
        delete args.username;
        return rv.pos;
    },

    onRemoteLogMessage : function(topic, value, type, pos, site) {
        var args = dojo.mixin({
            username : this.attend.getUserAtSite(site).username,
            pos : pos
        }, value);
        this._insertLogMessage(args);
    },

    onMapMarkerAdded: function(marker) {
        var info = {
            uuid : marker._uuid,
            latLng : marker.getPosition().toUrlValue()
        };
        // NO conflict resolution on add, new markers are unique
        this.collab.sendSync('marker.add.'+marker._uuid, info, null);
        // include in local log
        var args = {
            template : 'add_notice',
            username : this.username,
            latLng : marker.getPosition().toUrlValue()
        };
        var pos = this._insertLogMessage(args);
        // send to remote logs
        this.collab.sendSync('log.message', args, 'insert', pos)
    },

    onRemoteMapMarkerAdded: function(topic, value, type, pos, site) {
        var latLng = this.map.latLngFromString(value.latLng);
        var creator = this.attend.getUserAtSite(site).username;
        this.map.addMarker(value.uuid, creator, latLng);
    },

    onMapMarkerMoved: function(marker) {
        // reset zip visits info set by bot
        delete marker._visitCount;
        this.map.refreshInfoPop(marker);
        
        var info = {
            uuid : marker._uuid,
            latLng : marker.getPosition().toUrlValue()
        };
        // resolve relocation conflicts
        this.collab.sendSync('marker.move.'+marker._uuid, info, 'update');
        // include in local log
        var args = {
            template: 'move_notice',
            username : this.username,
            latLng : marker.getPosition().toUrlValue()
        };
        var pos = this._insertLogMessage(args);
        // send to remote logs
        this.collab.sendSync('log.message', args, 'insert', pos)
    },
    
    onRemoteMapMarkerMoved: function(topic, value) {
        // could receive repeat value when resolve conflict which doesn't hurt
        // us; pass it along
        var latLng = this.map.latLngFromString(value.latLng);
        var marker = this.map.getMarkerById(value.uuid);
        this.map.moveMarker(marker, latLng);
    },

    onMapMarkerAnimated: function(marker) {
        var info = {
            uuid : marker._uuid
        };
        // NO conflict resolution on animate, anyone can do it any number of
        // times without affecting state
        this.collab.sendSync('marker.anim.'+marker._uuid, info, null);
        // include in local log
        var args = {
            template : 'anim_notice',
            username : this.username,
            latLng : marker.getPosition().toUrlValue()
        };
        var pos = this._insertLogMessage(args);
        // send to remote logs
        this.collab.sendSync('log.message', args, 'insert', pos)
    },
    
    onRemoteMapMarkerAnimated: function(topic, value) {
        var marker = this.map.getMarkerById(value.uuid);
        this.map.animateMarker(marker);
    },

    onMapSyncClick: function() {
        this.onMapViewport('update')
    },
    
    onMapContinuousSyncClick: function(selected) {
        if(selected) {
            this.contTok = [];
            var self = this;
            this.contTok.push(dojo.connect(this.map, 'onMapCenter', 
                function(e, i) { self.onMapViewport(i ? null : 'update'); }));
            this.contTok.push(dojo.connect(this.map, 'onMapZoom', 
                function() { self.onMapViewport('update'); }));
            this.contTok.push(dojo.connect(this.map, 'onMapType', 
                function() { self.onMapViewport('update'); }));
        } else {
            dojo.forEach(this.contTok, dojo.disconnect);
            this.contTok = null;
        }
    },

    onMapViewport: function(type) {
        var args = {
            zoom : this.map.getZoom(),
            center : this.map.getCenter().toUrlValue(),
            type : this.map.getMapType()
        };
        this.collab.sendSync('map.viewport', args, type);
    },
    
    onRemoteMapViewport: function(topic, value) {
        var latLng = this.map.latLngFromString(value.center);
        this.map.setMapType(value.type);
        this.map.setZoom(value.zoom);
        this.map.setCenter(latLng);
    }
});

app = new comap.App();
app.run();

});