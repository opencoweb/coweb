//
// Represents a delete operation that removes a value from a linear 
// collection.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*global define*/
define([
    'coweb/jsoe/Operation',
    'coweb/jsoe/factory'
], function(Operation, factory) {
    var DeleteOperation = function(args) {
        Operation.call(this, args);
        this.type = 'delete';
    };
    DeleteOperation.prototype = new Operation();
    DeleteOperation.prototype.constructor = DeleteOperation;
    factory.registerOperationForType('delete', DeleteOperation);
    
    /**
     * Gets the method name to use to transform another operation against this
     * delete operation.
     *
     * @returns {String} Method name
     */
    DeleteOperation.prototype.transformMethod = function() {
        return 'transformWithDelete';
    };

    /**
     * No-op. Update has no effect on a delete.
     *
     * @param {UpdateOperation} op Update to include in this op
     * @returns {DeleteOperation} This instance
     */
    DeleteOperation.prototype.transformWithUpdate = function(op) {
        return this;
    };

    /**
     * Transforms this delete to include the effect of an insert.
     *
     * @param {InsertOperation} op Insert to include in this op
     * @returns {DeleteOperation} This instance
     */
    DeleteOperation.prototype.transformWithInsert = function(op) {
        if(this.key !== op.key) {
            return this;
        }
        if(this.position >= op.position) {
            ++this.position;
        }
        return this;
    };

    /**
     * Transforms this delete to include the effect of a delete.
     *
     * @param {DeleteOperation} op Delete to include in this op
     * @returns {DeleteOperation|null} This instance or null if this op has no
     * further effect on other operations
     */
    DeleteOperation.prototype.transformWithDelete = function(op) {
        if(this.key !== op.key) {
            return this;
        }
        if(this.position > op.position) {
            --this.position;
        } else if(this.position === op.position) {
            return null;
        }
        return this;
    };
    
    return DeleteOperation;
});
