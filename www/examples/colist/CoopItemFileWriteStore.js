//
// Adds create, update, delete cooperative features to a 
// dojo.data.ItemFileWriteStore object. Sends any local CRUD changes to remote
// instances and vice-versa while maintaining data store consistency. 
//
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
dojo.provide('colist.CoopItemFileWriteStore');
dojo.require('coweb');

dojo.declare('colist.CoopItemFileWriteStore', null, {
    // reference to a regular dojo.data.ItemFileWriteStore instance
    constructor: function(args) {
        this.dataStore = args.dataStore;
        this.id = args.id;
        if(!this.dataStore || !this.id) {
            throw new Error('missing dataStore or id argument');
        }
        // stores dojo.connect handles for observers of the data store
        this.dsHandles = {};
        // maps data store events to methods on this instance for ease of
        // connecting and disconnecting data store listeners
        this.typeToFuncs = {
            update: {ds : 'onSet', coop: 'onLocalUpdate'},
            insert: {ds : 'onNew', coop: 'onLocalInsert'},
            'delete': {ds : 'onDelete', coop: 'onLocalDelete'}
        };
        // subscribe to local datastore events to start
        this._dsConnect(true, 'insert');
        this._dsConnect(true, 'update');
        this._dsConnect(true, 'delete');
        // initialize collab interface using the dojo widget id as the
        // id for the collab instance
        this.collab = coweb.initCollab({id : this.id});
        // listen for datastore 'change' messages sent by remote instances of 
        // this widget; the change messages include item ids to allow coweb to
        // check consistency on a per-item basis, rather than per-grid, so we
        // include the * here to listen to all change messages
        this.collab.subscribeSync('change.*', this, 'onRemoteChange');
        // listen for requests from remote applications joining the session
        // when they ask for the full state of this widget
        this.collab.subscribeStateRequest(this, 'onGetFullState');
        // listen for responses from remote applications when this application
        // instance joins a session so it can bring itself up to the current 
        // state
        this.collab.subscribeStateResponse(this, 'onSetFullState');
    },
    
    /**
     * Connects or disconnects the observer method on this instance to one
     * of the data store events.
     *
     * @param connect True to connect, false to disconnect
     * @param type 'insert', 'update', or 'delete'
     */
    _dsConnect: function(connect, type) {
        if(connect) {
            // get info about the data store and local functions
            var funcs = this.typeToFuncs[type];
            // do the connect
            var h = dojo.connect(this.dataStore, funcs.ds, this, funcs.coop);
            // store the connect handle so we can disconnect later
            this.dsHandles[type] = h;
        } else {
            // disconnect using the previously stored handle
            dojo.disconnect(this.dsHandles[type]);
            // delete the handle
            this.dsHandles[type] = null;
        }
    },

    /**
     * Serializes a flat item in the data store to a regular JS object with 
     * name/value properties.
     *
     * @param item Item from the data store
     * @return row Object
     */
    _itemToRow: function(item) {
        var row = {};
        dojo.forEach(this.dataStore.getAttributes(item), function(attr) {
            row[attr] = this.dataStore.getValue(item, attr);
        }, this);
        return row;
    },
    
    /**
     * Called when a remote instance of this widget is joining a session and
     * wants to get up to speed. This instance sends the joining one a 
     * serialized array of all the items in the data store.
     *
     * @param params Object with properties for the ready event (see doc)
     */
    onGetFullState: function(token) {
        // collect all items
        var rows = [];
        this.dataStore.fetch({
            scope: this,
            onItem: function(item) {                
                var row = this._itemToRow(item);
                rows.push(row);
            }
        });
        this.collab.sendStateResponse(rows, token);
    },
    
    /**
     * Called when this instance of the widget is joining a session and wants
     * to get up to speed. A remote instance provides this widget with an
     * array of all the items in the data store.
     *
     * @param rows Array of row objects to be inserted as items
     */
    onSetFullState: function(rows) {
        // stop listening to local insert events from the data store else
        // we'll end up echoing all of the insert back to others in the session
        // via our onLocalInsert callback
        this._dsConnect(false, 'insert');
        // add all rows to the data store as items
        dojo.forEach(rows, this.dataStore.newItem, this.dataStore);
        // now resume listening for inserts
        this._dsConnect(true, 'insert');
    },
    
    /**
     * Called when an attribute of an existing item in the local data store 
     * changes value. Sends the item data and the name of the attribute that
     * changed to remote data stores.
     *
     * @param item Item object that changed
     * @param attr String attribute that changed
     * @param oldValue Previous value of the attr
     * @param newValue New value of the attr
     */
    onLocalUpdate: function(item, attr, oldValue, newValue) {
        // get all attribute values
        var row = this._itemToRow(item);
        // store whole row in case remote needs to reconstruct after delete
        // but indicate which attribute changed for the common update case
        var value = {};
        value.row = row;
        value.attr = attr;
	    value.action = 'update';
	    // name includes row id for conflict resolution
	    var id = this.dataStore.getIdentity(item);
	    var name = 'change.'+id;
	    this.collab.sendSync(name, value, 'update');
    },
    
    /**
     * Called when a new item appears in the local data store. Sends the new
     * item data to remote data stores.
     *
     * @param item New item object
     * @param parentInfo Unused
     */
    onLocalInsert: function(item, parentInfo) {
        // get all attribute values
        var row = this._itemToRow(item);
        var value = {};
        value.row = row;
	    value.action = 'insert';
	    // name includes row id for conflict resolution
	    var id = this.dataStore.getIdentity(item);
	    var name = 'change.'+id;
	    this.collab.sendSync(name, value, 'insert');
    },
    
    /**
     * Called when a item disappears from the local data store. Sends just the
     * id of the removed item to remote data stores.
     *
     * @param item Deleted item
     */
    onLocalDelete: function(item) {
        // get all attribute values
        var value = {};
        value.action = 'delete';
	    // name includes row id for conflict resolution
	    var id = this.dataStore.getIdentity(item);
	    var name = 'change.'+id;
	    this.collab.sendSync(name, value, 'delete');
    },
    
    /**
     * Called when a remote data store changes in some manner. Dispatches to
     * local methods for insert, update, delete handling.
     *
     * @param topic Full sync topic including the id of the item that changed
     * @param value Item data sent by remote data store
     */
    onRemoteChange: function(topic, value) {
        // retrieve the row id from the full topic
        var id = this.collab.getSyncNameFromTopic(topic).split('.')[1];
        if(value.action == 'insert') {
            this.onRemoteInsert(id, value);
        } else if(value.action == 'update') {
            this.onRemoteUpdate(id, value);
        } else if(value.action == 'delete') {
            this.onRemoteDelete(id);
        }
    },
    
    /**
     * Called when a new item appears in a remote data store. Creates an item
     * with the same id and value in the local data store.
     *
     * @param id Identity assigned to the item in the creating data store
     * @param value Item data sent by remote data store
     */
    onRemoteInsert: function(id, value) {
        // stop listening to local inserts
        this._dsConnect(false, 'insert');
        this.dataStore.newItem(value.row);
        // resume listening to local inserts
        this._dsConnect(true, 'insert');
    },
    
    /**
     * Called when an item attribute changes value in a remote data store.
     * Updates the attribute value of the item with the same id in the local
     * data store.
     *
     * @param id Identity of the item that changed
     * @param value Item data sent by remote data store
     */
    onRemoteUpdate: function(id, value) {
        // fetch the item by its id
        this.dataStore.fetchItemByIdentity({
            identity : id, 
            scope : this,
            onItem : function(item) {
                // stop listening to local updates
                this._dsConnect(false, 'update');
                var attr = value.attr;
                this.dataStore.setValue(item, attr, value.row[attr]);
                // resume listening to local updates
                this._dsConnect(true, 'update');
            }
        });
    },
    
    /**
     * Called when an item disappears from a remote data store. Removes the
     * item with the same id from the local data store.
     *
     * @param id Identity of the item that was deleted
     */
    onRemoteDelete: function(id) {
        // fetch the item by its id
        this.dataStore.fetchItemByIdentity({
            identity : id, 
            scope : this,
            onItem : function(item) {
                // stop listening to local deletes
                this._dsConnect(false, 'delete');
                this.dataStore.deleteItem(item);
                // resume listening to local deletes
                this._dsConnect(true, 'delete');
            }
        });
    }
});
