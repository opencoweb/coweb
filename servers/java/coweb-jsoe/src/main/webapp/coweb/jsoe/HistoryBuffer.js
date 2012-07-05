//
// History buffer storing original operations.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*jslint white:false, bitwise:true, eqeqeq:true, immed:true, nomen:false, 
  onevar:false, plusplus:false, undef:true, browser:true, devel:true, 
  forin:false, sub:false*/
/*global define*/
define([
    'coweb/jsoe/factory',
    'coweb/jsoe/Operation',
	'org/requirejs/i18n!../nls/messages'
], function(factory, Operation, messages) {
    /**
     * Stores information about local and remote operations for future 
     * transformations.
     *
     * @constructor
     */
    var HistoryBuffer = function() {
        this.ops = {};
        this.size = 0;    
    };

    /**
     * Serializes the history buffer contents to seed a remote instance.
     *
     * @return {Object[]} Serialized operations in the history
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
     * @param {Object[]} arr Array in the format returned by getState
     */
    HistoryBuffer.prototype.setState = function(arr) {
        // reset internals
        this.size = 0;
        this.ops = {};
        for(var i=0; i < arr.length; i++) {
            // restore operations
            var op = factory.createOperationFromState(arr[i]);
            this.addLocal(op);
        }
    };

    /**
     * Retrieves all of the operations represented by the given context
     * differences from the history buffer. Sorts them by total order, placing
     * any ops with an unknown place in the order (i.e., local ops) at the end
     * sorted by their sequence IDs. Throws an exception when a requested 
     * operation is missing from the history.
     *
     * @param {ContextDifference} cd  Context difference object
     * @returns {Operation[]} Sorted operations
     */ 
    HistoryBuffer.prototype.getOpsForDifference = function(cd) {
        // get the ops
        var keys = cd.getHistoryBufferKeys();
        var ops = [];
        for(var i=0, l=keys.length; i < l; i++) {
            var key = keys[i];
            var op = this.ops[key];
            if(op === undefined) {
                throw new Error(messages.missingop + i + 
                    ' key=' + key + ' keys=' + keys.toString());
            }
            ops.push(op);
        }
        // sort by total order
        ops.sort(function(a,b) { return a.compareByOrder(b); });
        return ops;
    };

    /**
     * Adds a local operation to the history.
     *
     * @param {Operation} Local operation to add
     */
    HistoryBuffer.prototype.addLocal = function(op) {
        var key = factory.createHistoryKey(op.siteId, op.seqId);
        this.ops[key] = op;
        // make sure ops in the history never change
        op.immutable = true;
        ++this.size;
    };

    /**
     * Adds a received operation to the history. If the operation already 
     * exists in the history, simply updates its order attribute. If not, 
     * adds it. Throws an exception if the op does not include its place in 
     * the total order or if the op with the same key already has an assigned
     * place in the total order.
     *
     * @param {Operation} Received operation to add
     */
    HistoryBuffer.prototype.addRemote = function(op) {
        var key = factory.createHistoryKey(op.siteId, op.seqId);
        var eop = this.ops[key];
        if(op.order === null || op.order === undefined || 
        op.order === Infinity) {
            // remote op must have order set by server
            throw new Error(messages.missingtotal);
        } else if(eop) {
            if(eop.order !== Infinity) {
                // order should never repeat
                throw new Error(messages.dupop+eop.order +
                    ' new='+op.order);
            }
            // server has responded with known total order for an op this site
            // previously sent; update the local op with the info
            eop.order = op.order;
        } else {
            // add new remote op to history
            this.ops[key] = op;
            op.immutable = true;
            ++this.size;
        }
    };

    /**
     * Removes and returns an operation in the history.
     *
     * @param {Operation} op Operation to locate for removal
     * @returns {Operation} Removed operation
     */
    HistoryBuffer.prototype.remove = function(op) {
        var key = factory.createHistoryKey(op.siteId, op.seqId);
        op = this.ops[key];
        delete this.ops[key];
        // no longer in the history, so allow mutation
        op.immutable = false;
        --this.size;
        return op;
    };

    /**
     * Gets the number of operations in the history.
     *
     * @returns {Number} Integer count
     */
    HistoryBuffer.prototype.getCount = function() {
        return this.size;
    };

    /**
     * Gets all operations in the history buffer sorted by context.
     *
     * @returns {Operation[]} Sorted operations
     */
    HistoryBuffer.prototype.getContextSortedOperations = function() {
        var ops = [];
        // put all ops into an array
        for(var key in this.ops) {
            if(this.ops.hasOwnProperty(key)) {
                ops.push(this.ops[key]);
            }
        }
        // sort them by context, sequence, and site
        ops.sort(function(a,b) { return a.compareByContext(b); });
        return ops;
    };
    
    return HistoryBuffer;
});
