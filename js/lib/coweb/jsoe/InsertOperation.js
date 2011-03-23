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
     * @return String method name
     */
    InsertOperation.prototype.transformMethod = function() {
        return 'transformWithInsert';
    };

    /**
     * No-op. Update has no effect on an insert.
     *
     * @param op UpdateOperation object
     * @return This instance
     */
    InsertOperation.prototype.transformWithUpdate = function(op) {
        return this;
    };

    /**
     * Transforms this insert to include the effect of an insert.
     *
     * @param op InsertOperation object
     * @return This instance
     */
    InsertOperation.prototype.transformWithInsert = function(op) {
        if(this.key !== op.key) {
            return this;
        }

        if(this.position < op.position || (this.position === op.position && this.siteId > op.siteId)) {
            return this;
        }
        ++this.position;
        return this;

        // if(this.position > op.position) {
        //     ++this.position;
        // } else if(this.position === op.position) {
        //     // if(this.origPosition > op.origPosition) {
        //     //     // adjust local position if other's position is earlier
        //     //     ++this.position;
        //     // } else if(this.origPosition === op.origPosition) {
        //     //     var rv = this.origContextVector.compare(op.origContextVector);
        //     //     if(rv < 0) {
        //     //         // adjust local position if other's original context is later
        //     //         ++this.position;
        //     //     } else if(rv === 0 && this.siteId > op.siteId) {
        //     if(this.siteId < op.siteId) {
        //         ++this.position;
        //     }
        //         // }
        //     // }
        // }
        // return this;
    };

    /**
     * Transforms this insert to include the effect of a delete.
     *
     * @param op DeleteOperation object
     * @return This instance or null
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
