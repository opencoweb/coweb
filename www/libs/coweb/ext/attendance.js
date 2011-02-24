//
// Tracks session attendance.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*global define*/
define([
    'coweb/main',
    'coweb/util/Promise'
], function(coweb, Promise) {
    var attendance = {
        // all attendees, read-only externally
        users : {},
        // total attendee count, read-only externally
        count : 0,
        // subscriptions
        _subs : {
            'localjoin' : {},
            'remoteexisting' : {},
            'remotejoin' : {},
            'remoteleave' : {}
        },
        // next subscription id
        _subId : 0,
        _subscribe : function(event, context, callback) {
            if(callback === undefined) {
                callback = context;
                context = this;
            }
            if(typeof callback !== 'function') {
                callback = context[callback];
                if(typeof callback !== 'function') {
                    throw new Error('callback must be a function');
                }
            }
            var s = this._subs[event];
            var id = this._subId;
            s[id] = {
                context : context,
                callback : callback
            };
            this._subId++;
            return event+'.'+id;
        },
        
        _notify : function(event, user, count) {
            var subs = this._subs[event];
            for(var id in subs) {
                if(subs.hasOwnProperty()) {
                    var s = subs[id];
                    try {
                        s.callback.call(s.context, user, count);
                    } catch(e) {
                        console.error(e);
                    }
                }
            }
        },

        /**
         * Subscribes to local user join events.
         *
         * @param callback Function to invoke
         * @return Promise which always notifies success
         */
        subscribeLocalJoin: function(context, callback) {
            var tok = this._subscribe('localjoin', context, callback);
            var promise = new Promise();
            promise._cowebToken = tok;
            promise.resolve();
            return promise;
        },
    
        /**
         * Subscribes to remote existing user attendance events.
         *
         * @param callback Function to invoke
         * @return Promise which always notifies success
         */    
        subscribeRemoteExisting: function(context, callback) {
            var tok = this._subscribe('remoteexisting', context, callback);
            var promise = new Promise();
            promise._cowebToken = tok;
            promise.resolve();
            return promise;        
        },

        /**
         * Subscribes to remote user join events.
         *
         * @param callback Function to invoke
         * @return Promise which always notifies success
         */    
        subscribeRemoteJoin: function(context, callback) {
            var tok = this._subscribe('remotejoin', context, callback);
            var promise = new Promise();
            promise._cowebToken = tok;
            promise.resolve();
            return promise;        
        },

        /**
         * Subscribes to remote user leave events.
         *
         * @param callback Function to invoke
         * @return Promise which always notifies success
         */
        subscribeRemoteLeave: function(context, callback) {
            var tok = this._subscribe('remoteleave', context, callback);
            var promise = new Promise();
            promise._cowebToken = tok;
            promise.resolve();
            return promise;
        },

        /**
         * Unsubscribes any subscription created via this interface.
         *
         * @param promise Promise returned from subscribe method
         */
        unsubscribe: function(promise) {
            var tok = promise._cowebToken;
            if(tok) {
                var segs = tok.split('.');
                // set for event
                var s = this._subs[segs[0]];
                if(s) {
                    // subscriber id
                    delete s[segs[1]];
                }
            }
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
         * Called when the application enters a conference.
         */
        _onLocalJoin: function(params) {
            var users = [];
            for(var site in params.roster) {
                var username = params.roster[site];
                users.push(this._addUser(site, username));
            }
            // notify about all existing users all at once
            this._notify('remoteexisting', users, this.count);

            var user = this._addUser(params.site, params.username);
            if(user) {
                this._notify('localjoin', user, this.count);
            }
        },

        /**
         * Called when a remote app indicates it is fully joined to the conference.
         */
        _onRemoteJoin: function(params) {
            var user = this._addUser(params.site, params.username);
            if(user) {
                this._notify('remotejoin', user, this.count);
            }
        },
    
        /**
         * Called when this app sees a remote app leave the conference.
         */
        _onRemoteLeave: function(params) {
            var user = this._removeUser(params.site);
            if(user) {
                this._notify('remoteleave', user, this.count);
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
    collab.subscribeConferenceReady(attendance, '_onLocalJoin');
    collab.subscribeSiteJoin(attendance, '_onRemoteJoin');
    collab.subscribeSiteLeave(attendance, '_onRemoteLeave');
    return attendance;
});