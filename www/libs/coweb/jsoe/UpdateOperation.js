//
// Represents an update operation that replaces the value of one property
// with another.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
define([
    'coweb/jsoe/Operation'
], function(Operation) {
    var UpdateOperation = function(args) {
        Operation.call(this, args);
        this.type = 'update';
    };
    UpdateOperation.prototype = new Operation();
    UpdateOperation.prototype.constructor = UpdateOperation;

    /**
     * Gets the method name to use to transform another operation against this
     * update operation.
     *
     * @return String method name
     */
    UpdateOperation.prototype.transformMethod = function() {
        return 'transformWithUpdate';
    };

    /**
     * Transforms this update to include the effect of an update.
     *
     * @param op UpdateOperation object
     * @return This instance
     */
    UpdateOperation.prototype.transformWithUpdate = function(op) {
        if((op.position != this.position) || (op.key != this.key)) {
            return this;
        }

        if(this.siteId > op.siteId) {
            this.value = op.value;
        } else if((this.siteId == op.siteId) && (this.seqId < op.seqId)) {
            this.value = op.value;
        }
        return this;
    };

    /**
     * Transforms this update to include the effect of an insert.
     *
     * @param op InsertOperation object
     * @return This instance
     */
    UpdateOperation.prototype.transformWithInsert = function(op) {
        if(this.key != op.key) {
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
     * @param op DeleteOperation object
     * @return This instance or null
     */
    UpdateOperation.prototype.transformWithDelete = function(op) {
        if(this.key != op.key) {
            return this;
        }
        if(this.position > op.position) {
            --this.position;
        } else if(this.position == op.position) {
            return null;
        }
        return this;
    };
    
    return UpdateOperation;
});
