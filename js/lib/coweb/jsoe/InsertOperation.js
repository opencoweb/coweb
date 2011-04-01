//
// Represents an insert operation that adds a value to a linear collection.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*global define*/
define([
    'coweb/jsoe/Operation',
    'coweb/jsoe/factory'
], function(Operation, factory) {
    var InsertOperation = function(args) {
        Operation.call(this, args);
        this.type = 'insert';
    };
    InsertOperation.prototype = new Operation();
    InsertOperation.prototype.constructor = InsertOperation;
    factory.registerOperationForType('insert', InsertOperation);
        
    /**
     * Gets the method name to use to transform another operation against this
     * insert operation.
     *
     * @returns {String} Method name
     */
    InsertOperation.prototype.transformMethod = function() {
        return 'transformWithInsert';
    };

    /**
     * No-op. Update has no effect on an insert.
     *
     * @param {UpdateOperation} op Update to include in this op
     * @returns {InsertOperation} This instance
     */
    InsertOperation.prototype.transformWithUpdate = function(op) {
        return this;
    };

    /**
     * Transforms this insert to include the effect of an insert. Assumes 
     * the control algorithm breaks the CP2 pre-req to ensure convergence.
     *
     * @param {InsertOperation} op Insert to include in this op
     * @returns {InsertOperation} This instance
     */
    InsertOperation.prototype.transformWithInsert = function(op) {
        if(this.key !== op.key) {
            return this;
        }

        if(this.position > op.position || 
            (this.position === op.position && this.siteId <= op.siteId)) {
            ++this.position;
        }
        return this;
    };

    /**
     * Transforms this insert to include the effect of a delete.
     *
     * @param {DeleteOperation} op Delete to include in this op
     * @return {InsertOperation} This instance
     */
    InsertOperation.prototype.transformWithDelete = function(op) {
        if(this.key !== op.key) {
            return this;
        }
        if(this.position > op.position) {
            --this.position;
        }
        return this;
    };
    
    return InsertOperation;
});
