//
// Represents an update operation that replaces the value of one property
// with another.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*global define*/
define([
    'coweb/jsoe/Operation',
    'coweb/jsoe/factory'
], function(Operation, factory) {
    var UpdateOperation = function(args) {
        Operation.call(this, args);
        this.type = 'update';
    };
    UpdateOperation.prototype = new Operation();
    UpdateOperation.prototype.constructor = UpdateOperation;
    factory.registerOperationForType('update', UpdateOperation);

    /**
     * Gets the method name to use to transform another operation against this
     * update operation.
     *
     * @return {String} Method name
     */
    UpdateOperation.prototype.transformMethod = function() {
        return 'transformWithUpdate';
    };

    /**
     * Transforms this update to include the effect of an update.
     *
     * @param {UpdateOperation} op Update to include in this op
     * @returns {UpdateOperation} This instance
     */
    UpdateOperation.prototype.transformWithUpdate = function(op) {
        if((op.position !== this.position) || (op.key !== this.key)) {
            return this;
        }

        if(this.siteId > op.siteId) {
            this.value = op.value;
        } else if((this.siteId === op.siteId) && (this.seqId < op.seqId)) {
            this.value = op.value;
        }
        return this;
    };

    /**
     * Transforms this update to include the effect of an insert.
     *
     * @param {InsertOperation} op Insert to include in this op
     * @returns {UpdateOperation} This instance
     */
    UpdateOperation.prototype.transformWithInsert = function(op) {
        if(this.key !== op.key) {
            return this;
        }
        if(this.position >= op.position) {
            ++this.position;
        }
        return this;
    };

    /**
     * Transforms this update to include the effect of a delete.
     *
     * @param {DeleteOperation} op Delete to include in this op
     * @returns {UpdateOperation} This instance
     */
    UpdateOperation.prototype.transformWithDelete = function(op) {
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
    
    return UpdateOperation;
});
