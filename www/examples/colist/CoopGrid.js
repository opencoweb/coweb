//
// Adds focus tracking cooperative features to a dojox.grid control. Shows
// where remote users currently have the input focus.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*global define dojo*/
define([
    'coweb/main'
], function(coweb) {
    var CoopGrid = function(args) {
        this.grid = args.grid;
        this.id = args.id;
        if(!this.grid || !this.id) {
            throw new Error('missing dataStore or id argument');
        }
        // tracks focus info for remote instances of this widget, key: site id,
        // value: object with focused datastore item id and attr in the 
        // focused column
        this.focused = {};
        // this user's site id
        this.site = null;
        // listen for focus and style events on the grid
        dojo.connect(this.grid, 'onCellFocus', this, 'onFocusLocalCell');
        dojo.connect(this.grid, 'onStyleRow', this, 'onStyleRow');
        // initialize collab interface using the dojo widget id as the
        // id for the collab instance
        this.collab = coweb.initCollab({id : this.id});
        // listen for 'focus' messages sent by remote instances of this widget
        this.collab.subscribeSync('focus', this, 'onFocusRemoteCell');
        // listen for when this app instance is in the session and ready to 
        // send and receive events
        this.collab.subscribeConferenceReady(this, 'onConferenceReady');
        // listen for other sites leaving the session so we can cleanup their
        // focus tracking information
        this.collab.subscribeSiteLeave(dojo.hitch(this, 'onSiteLeave'));
        // listen for requests from remote applications joining the session
        // when they ask for the full state of this widget
        this.collab.subscribeStateRequest(dojo.hitch(this, 'onGetFullState'));
        // listen for responses from remote applications when this application
        // instance joins a session so it can bring itself up to the current 
        // state
        this.collab.subscribeStateResponse(dojo.hitch(this, 'onSetFullState'));        
    };
    var proto = CoopGrid.prototype;
    
    /**
     * Called when this local application instance is joined to a session and
     * has already received full state from another attendee in the session.
     * Stores the site id of this instance for later use.
     *
     * @param params Object with properties for the ready event (see doc)
     */
    proto.onConferenceReady = function(params) {
        this.site = params.site;
    };

    /**
     * Called when a remote application instance leaves the session. Removes
     * focus information for the leaving site and refreshes the grid view.
     *
     * @param params Object with properties for the ready event (see doc)
     */
    proto.onSiteLeave = function(params) {
        delete this.focused[params.site];
        this.grid.render();
    };

    /**
     * Called when a remote instance of this widget is joining a session and
     * wants to get up to speed. This instance send the joining one the list of
     * focused items.
     *
     * @param params Object with properties for the ready event (see doc)
     */
    proto.onGetFullState = function(token) {
        this.collab.sendStateResponse(this.focused, token);
    };

    /**
     * Called when this instance of the widget is joining a session and wants
     * to get up to speed. A remote instance provides this widget with its list
     * of focused items. This widget forces its grid to redraw so it can mark
     * those focused items.
     *
     * @param focused The state of the focused grid cells sent by a remote
     *   widget instance in its onGetFullState method
     */
    proto.onSetFullState = function(focused) {
        this.focused = focused;
        this.grid.render();
    };

    /**
     * Called when the grid is styling a row for display. Adds the class name
     * 'tutFocus' to any row that is focused in a remote instance of the grid.
     * Decides which rows to mark as focused based on item ids, NOT row index,
     * because the sort order might be different across remote instances of
     * the grid.
     *
     * @param row Row object including the row index as one of its properties
     */
    proto.onStyleRow = function(row) {
        // get the item shown in the row
        var item = this.grid.getItem(row.index);
        // abort if we couldn't find the item for this row
        if(!item) { return; }
        // get the id of the item shown in the row
        var id = this.grid.store.getIdentity(item);
        // look through which rows are focused
        for(var site in this.focused) {
            if(this.focused.hasOwnProperty(site)) {
                // add the css class to rows that are focused in remote grids
                // but ignore local
                site = Number(site);
                if(this.focused[site] === id && site !== this.site) {
                    row.customClasses += ' focused';
                }
            }
        }
    };

    /**
     * Called when the user gives focus (keyboard or mouse) to a certain cell.
     * Figures out which item is shown in the row containing the focus.
     * Also figures out which attribute is shown in the selected column.
     * Sends the information to remote instances of this widget.
     *
     * @param cell Focused cell object from grid
     * @param rowIndex Index of row containing the focused cell
     */
    proto.onFocusLocalCell = function(cell, rowIndex) {
        // get item associated with row containing the focused cell
        var item = this.grid.getItem(rowIndex);
        // get identity of the item
        var id = this.grid.store.getIdentity(item);
        var value = {id : id};
        // send sync with no consistency maintenance
        this.collab.sendSync('focus', value, null);
        // store local focus too for late joiners
        this.focused[this.site] = id;
    };

    /**
     * Called when a remote widget instance reports focus on a cell.
     * Stores the id of the item associated with the row that is now focused
     * so it can be styled the next time the grid renders itself.
     *
     * @param topic Unused
     * @param value Object sent from a remote widget in its onFocusLocalCell
     * @param type Unused
     * @param pos Unused
     * @param site Unique site id of the sending widget instance
     */
    proto.onFocusRemoteCell = function(topic, value, type, pos, site) {
        // store the selected id and the site that has it selected
        this.focused[site] = value.id;
        this.grid.render();
    };
    
    return CoopGrid;
});