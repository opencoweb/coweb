//
// Represents a delete operation that removes a value from a linear 
// collection.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
define([
    'coweb/jsoe/Operation'
], function(Operation) {
    var DeleteOperation = function() {};
    DeleteOperation.prototype = new Operation();
    
    /**
     * Gets the method name to use to transform another operation against this
     * delete operation.
     *
     * @return String method name
     */
    DeleteOperation.prototype.transformMethod = function() {
        return 'transformWithDelete';
    };

    /**
     * No-op. Update has no effect on a delete.
     *
     * @param op UpdateOperation object
     * @return This instance
     */
    DeleteOperation.prototype.transformWithUpdate = function(op) {
        return this;
    };

    /**
     * Transforms this delete to include the effect of an insert.
     *
     * @param op InsertOperation object
     * @return This instance
     */
    DeleteOperation.prototype.transformWithInsert = function(op) {
        if(this.key != op.key) {
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
     * @param op DeleteOperation object
     * @return This instance or null
     */
    DeleteOperation.prototype.transformWithDelete = function(op) {
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
    
    return DeleteOperation;
});
