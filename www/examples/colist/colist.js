//
// Cooperative list app.
//
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
dojo.require('coweb');
dojo.require('coweb.ext.ui.BusyDialog');
dojo.require('colist.CoopItemFileWriteStore');
dojo.require('colist.CoopGrid');
dojo.require('dojox.grid.DataGrid');
dojo.require('dojo.data.ItemFileWriteStore');
dojo.require('dijit.form.Button');
dojo.require('dijit.layout.BorderContainer');
dojo.require('dijit.layout.ContentPane');

// have to wrap class decl in ready when using dojo xd loader
dojo.ready(function() {
    /**
     * Adds a new row with default values to the local grid.
     */
    function onAddRow() {
        // make pseudo-unique ids
        var date = new Date();
        var id = String(Math.random()).substr(2) + String(date.getTime()); 
        dataStore.newItem({
            id: id,
            name: 'New item',
            amount: 0
        });
    };

    /**
     * Removes all selected rows from the grid.
     */
    function onRemoveRow() {
        grid.removeSelectedRows();
    };
    
    // configure the grid datastore, starting it empty
    var emptyData = {identifier : 'id', label : 'name', items: []};
    var dataStore = new dojo.data.ItemFileWriteStore({data : emptyData});
    var grid = dijit.byId('grid');
    grid.setStore(dataStore);
    
    // instantiate our cooperative datastore extension, giving it a 
    // reference to the dojo.data.ItemFileWriteStore object
    var args = {dataStore : dataStore, id : 'colist_store'};
    var coopDataStore = new colist.CoopItemFileWriteStore(args);
    
    // instantiate our cooperative grid extension, giving it a reference
    // to the dojox.grid.DataGrid widget
    args = {grid : grid, id : 'colist_grid'};
    var coopGrid = new colist.CoopGrid(args);

    // listen to and enable add/delete buttons
    var addButton = dijit.byId('addRowButton');
    var removeButton = dijit.byId('removeRowButton');
    dojo.connect(addButton, 'onClick', onAddRow);
    dojo.connect(removeButton, 'onClick', onRemoveRow);
        
    // get a session instance
    var sess = coweb.initSession({adminUrl : djConfig.cowebAdminUrl});
    // use the ext busy dialog to show progress joining/updating
    coweb.ext.ui.createBusy(sess);
    // do the prep and autoJoin / autoUpdate
    var prep = {collab: true, autoJoin : true, autoUpdate: true};
    sess.prepareConference(prep);
});