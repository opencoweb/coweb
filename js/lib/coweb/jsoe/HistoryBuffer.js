//
// History buffer storing original operations.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*global define*/
define([
    'coweb/jsoe/factory',
    'coweb/jsoe/Operation'
], function(factory, Operation) {
    /**
     * Stores information about local and remote operations for future 
     * transformations.
     * 
     * @ivar size Integer number of ops in the history
     * @ivar ops Object with string keys mapped to operation objects
     */
    var HistoryBuffer = function() {
        this.ops = {};
        this.size = 0;    
        this.order = 0;
    };

    /**
     * Serializes the history buffer contents to seed a remote instance.
     *
     * @return Array of string keys and serialized operation objects
     */
    HistoryBuffer.prototype.getState = function() {
        // pack keys and values into linear array to minimize wire size
        var arr = [];
        var i = 0;
        for(var key in this.ops) {
            if(this.ops.hasOwnProperty(key)) {
                // only deal with values, keys can be rebuilt from them
                arr[i] = this.ops[key].getState();
                ++i;
            }
        }
        return arr;
    };

    /**
     * Unserializes history buffer contents to initialize this instance.
     *
     * @param arr Array in the format returned by getState
     */
    HistoryBuffer.prototype.setState = function(arr) {
        // reset internals
        this.size = 0;
        this.ops = {};
        for(var i=0; i < arr.length; i++) {
            // restore operations
            var op = factory.createOperationFromState(arr[i]);
            this.add(op);
        }
    };

    /**
     * Retrieves all of the operations represented by the given context
     * differences from the history buffer. Sorts them by context. Throws an
     * exception when a requested operation is missing from the history.
     *
     * @param cd Context difference object
     * @return Array of operation objects
     */ 
    HistoryBuffer.prototype.getOpsForDifference = function(cd) {
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
        // @debug: sort by order added to history
        ops.sort(function(a,b) { return (a.order < b.order) ? -1 : 1 ; });
        return ops;
    };

    /**
     * Adds an operation to the history.
     *
     * @param op Operation instance
     */
    HistoryBuffer.prototype.add = function(op) {
        var key = factory.createHistoryKey(op.siteId, op.seqId);
        this.ops[key] = op;
        op.order = this.order++;
        op.immutable = true;
        ++this.size;
    };

    /**
     * Removes and returns an operation in the history.
     *
     * @param op Operation instance
     * @return Operation removed
     */
    HistoryBuffer.prototype.remove = function(op) {
        var key = factory.createHistoryKey(op.siteId, op.seqId);
        op = this.ops[key];
        delete this.ops[key];
        op.immutable = false;
        --this.size;
        return op;
    };

    /**
     * Gets the number of operations in the history.
     *
     * @return Integer count
     */
    HistoryBuffer.prototype.getCount = function() {
        return this.size;
    };

    /**
     * Gets all operations in the history buffer sorted by context.
     *
     * @return Array of operations
     */
    HistoryBuffer.prototype.getSortedOperations = function() {
        var ops = [];
        // put all ops into an array
        for(var key in this.ops) {
            if(this.ops.hasOwnProperty(key)) {
                ops.push(this.ops[key]);
            }
        }
        // sort them by context, sequence, and site
        ops.sort(function(a,b) { return a.compare(b); });
        return ops;
    };
    
    return HistoryBuffer;
});
