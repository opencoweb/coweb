//
// Tracks session attendance.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
dojo.provide('coweb.ext.attendance');
dojo.require('coweb');

coweb.ext.attendance = (function() {
    var obj = {
        users : {},
        count : 0,
        /**
         * Subscribes to local user join events.
         *
         * @param callback Function to invoke
         * @return dojo.Deferred which always notifies success
         */
        subscribeLocalJoin: function(context, callback) {
            var tok = dojo.connect(this, 'onLocalJoin', context, callback);
            var def = new dojo.Deferred();
            def._pbsToken = tok;
            def.callback();
            return def;
        },
    
        /**
         * Subscribes to remote existing user attendance events.
         *
         * @param callback Function to invoke
         * @return dojo.Deferred which always notifies success
         */    
        subscribeRemoteExisting: function(context, callback) {
            var tok = dojo.connect(this, 'onRemoteExisting', context, callback);
            var def = new dojo.Deferred();
            def._pbsToken = tok;
            def.callback();
            return def;        
        },

        /**
         * Subscribes to remote user join events.
         *
         * @param callback Function to invoke
         * @return dojo.Deferred which always notifies success
         */    
        subscribeRemoteJoin: function(context, callback) {
            var tok = dojo.connect(this, 'onRemoteJoin', context, callback);
            var def = new dojo.Deferred();
            def._pbsToken = tok;
            def.callback();
            return def;        
        },
    
        /**
         * Subscribes to remote user leave events.
         *
         * @param callback Function to invoke
         * @return dojo.Deferred which always notifies success
         */
        subscribeRemoteLeave: function(context, callback) {
            var tok = dojo.connect(this, 'onRemoteLeave', context, callback);
            var def = new dojo.Deferred();
            def._pbsToken = tok;
            def.callback();
            return def;
        },
    
        /**
         * Unsubscribes any subscription created via this interface.
         *
         * @param callback Function to invoke
         * @param def dojo.Deferred returned by the method that created the
         *   subscription
         */    
        unsubscribe: function(def) {
            dojo.disconnect(def._pbsToken);
        },

        /**
         * Gets the name of the user at the given site. If not found, returns
         * undefined.
         *
         * @param site Integer site ID
         */
        getUserAtSite: function(site) {
            return this.users[site];
        },
    
        /**
         * Extension point. Called when the local user joins the session.
         */
        onLocalJoin: function(user, count) {
            //console.debug('onLocalJoin', count);
        },
    
        /**
         * Extension point. Called when the local user joins the session to notify
         * about remote users already in the session.
         */
        onRemoteExisting: function(users, count) {
            //console.debug('onRemoteExisting', count);
        },

        /**
         * Extension point. Called when a remote user joins the session.
         */
        onRemoteJoin: function(user, count) {
            //console.debug('onRemoteJoin', count);
        },
    
        /**
         * Extension point. Called when a remote user leaves the session.
         */
        onRemoteLeave: function(user, count) {
            //console.debug('onRemoteLeave', count);
        },
    
        /**
         * Called when the application enters a conference.
         */
        _onLocalJoin: function(params) {
            var users = [];
            for(var site in params.roster) {
                var username = params.roster[site];
                users.push(this._addUser(site, username));
            }
            // notify about all existing users all at once
            this.onRemoteExisting(users, this.count);

            var user = this._addUser(params.site, params.username);
            if(user) {
                this.onLocalJoin(user, this.count);
            }
        },

        /**
         * Called when a remote app indicates it is fully joined to the conference.
         */
        _onRemoteJoin: function(params) {
            var user = this._addUser(params.site, params.username);
            if(user) {
                this.onRemoteJoin(user, this.count);
            }
        },
    
        /**
         * Called when this app sees a remote app leave the conference.
         */
        _onRemoteLeave: function(params) {
            var user = this._removeUser(params.site);
            if(user) {
                this.onRemoteLeave(user, this.count);
            }
        },

        /**
         * Add a new user to track.
         *
         * @param site Unique site integer of the user
         * @param username Human readable string name of the user
         * @return User object
         */
        _addUser: function(site, username) {
            var user = this.users[site];
            // don't increment count or construct a user
            if(user) { return; }
            ++this.count;
            // build a user object
            user = {site : site, username : username};
            // store it
            this.users[site] = user;
            return user;
        },

        /**
         * Stop tracking a user.
         *
         * @param site Unique site integer of the user
         * @return User object
         */
        _removeUser: function(site) {
            // get the user
            var user = this.users[site];
            // decrement count if user exists
            if(user) { --this.count; }
            // remove the stored user
            delete this.users[site];
            return user;
        }
    };

    // connect to collab events
    var collab = coweb.initCollab({id : 'coweb-ext-attendance'});
    collab.subscribeConferenceReady(obj, '_onLocalJoin');
    collab.subscribeSiteJoin(obj, '_onRemoteJoin');
    collab.subscribeSiteLeave(obj, '_onRemoteLeave');
    return obj;
})();