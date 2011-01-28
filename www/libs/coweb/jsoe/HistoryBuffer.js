//
// History buffer storing original operations.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
dojo.provide('coweb.jsoe.HistoryBuffer');

/**
 * Creates a history buffer key from a site ID and sequence ID.
 *
 * @param site Integer site ID
 * @param seq Integer sequence ID at that site
 * @return String key
 */
coweb.jsoe.createHistoryKey = function(site, seq) {
    return site + ',' + seq;
};

/**
 * Stores information about local and remote operations for future 
 * transformations.
 * 
 * @ivar ops Object with string keys mapped to operation objects
 * @ivar size Integer number of ops in the history
 */
dojo.declare('coweb.jsoe.HistoryBuffer', null, {
    /**
     * Initializes the history to an empty state.
     */
    constructor: function() {
        this.ops = {};
        this.size = 0;
    },

    /**
     * Serializes the history buffer contents to seed a remote instance.
     *
     * @return Array of string keys and serialized operation objects
     */
    getState: function() {
        // pack keys and values into linear array to minimize wire size
        var arr = [];
        var i = 0;
        for(var key in this.ops) {
            // only deal with values, keys can be rebuilt from them
            arr[i] = this.ops[key].getState();
            ++i;
        }
        return arr;
    },

    /**
     * Unserializes history buffer contents to initialize this instance.
     *
     * @param arr Array in the format returned by getState
     */
    setState: function(arr) {
        // reset internals
        this.size = 0;
        this.ops = {};
        for(var i=0; i < arr.length; i++) {
            // restore operations
            this.add(new coweb.jsoe.Operation({'state' : arr[i]}));
        }
    },

    /**
     * Retrieves all of the operations represented by the given context
     * differences from the history buffer. Sorts them by context. Throws an
     * exception when a requested operation is missing from the history.
     *
     * @param cd Context difference object
     * @return Array of operation objects
     */ 
    getOpsForDifference: function(cd) {
        // get the ops
        var keys = cd.getHistoryBufferKeys();
        var ops = [];
        for(var i=0; i < keys.length; i++) {
            var key = keys[i];
            var op = this.ops[key];
            if(op === undefined) {
                throw new Error('missing operation: i=' + i + ' key=' + key + ' keys=' + keys.toString());
            }
            ops.push(op);
        }
        // sort them by context, sequence, and site
        ops.sort(function(a,b) { return a.compare(b); });
        return ops;
    },

    /**
     * Adds an operation to the history.
     *
     * @param op Operation instance
     */
    add: function(op) {
        var key = coweb.jsoe.createHistoryKey(op.siteId, op.seqId);
        this.ops[key] = op;
        op.immutable = true;
        ++this.size;
    },

    /**
     * Removes and returns an operation in the history.
     *
     * @param op Operation instance
     * @return Operation removed
     */
    remove: function(op) {
        var key = coweb.jsoe.createHistoryKey(op.siteId, op.seqId);
        op = this.ops[key];
        delete this.ops[key];
        op.immutable = false;
        --this.size;
        return op;
    },

    /**
     * Gets the number of operations in the history.
     *
     * @return Integer count
     */
    getCount: function() {
        return this.size;
    },

    /**
     * Gets all operations in the history buffer sorted by context.
     *
     * @return Array of operations
     */
    getSortedOperations: function() {
        var ops = [];
        // put all ops into an array
        for(var key in this.ops) {
            ops.push(this.ops[key]);
        }
        // sort them by context, sequence, and site
        ops.sort(function(a,b) { return a.compare(b); });
        return ops;
    }
});
