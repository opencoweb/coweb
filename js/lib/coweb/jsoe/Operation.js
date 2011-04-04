//
// Defines the base class for operations.
//
// @todo: probably shouldn't be a class for performance; a bunch of functions
// that act on raw js objects representing ops would cut out the serialize
// steps and make copy simpler most likely
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*global define*/
define([
    'coweb/jsoe/ContextVector'
], function(ContextVector) {
    /**
     * Contains information about a local or remote event for transformation.
     *
     * Initializes the operation from serialized state or individual props if
     * state is not defined in the args parameter.
     *
     * @param {Object[]} args.state Array in format returned by getState 
     * bundling the following individual parameter values
     * @param {Number} args.siteId Integer site ID where the op originated
     * @param {ContextVector} args.contextVector Context in which the op 
     * occurred
     * @param {String} args.key Name of the property the op affected
     * @param {String} args.value Value of the op
     * @param {Number} args.position Integer position of the op in a linear
     * collection
     * @param {Number} args.order Integer sequence number of the op in the 
     * total op order across all sites
     * @param {Number} args.seqId Integer sequence number of the op at its
     * originating site. If undefined, computed from the context vector and
     * site ID.
     * @param {Boolean} args.immutable True if the copy method returns a true
     * copy or false if the copy method may shortcut and return a shared ref
     * to this instance
     */
    var Operation = function(args) {
        if(args === undefined) {
            // abstract
            this.type = null;
            return;
        } else if(args.state) {
            // restore from state alone
            this.setState(args.state);
            this.xCache = {
                byContext : {},
                byOrder : []
            };
        } else {
            // use individual properties
            this.siteId = args.siteId;
            this.contextVector = args.contextVector;
            this.key = args.key;
            this.value = args.value;
            this.position = args.position;
            this.order = args.order || Infinity;
            if(args.seqId !== undefined) { 
                this.seqId = args.seqId;
            } else if(this.contextVector) {
                this.seqId = this.contextVector.getSeqForSite(this.siteId) + 1;
            } else {
                throw new Error('missing sequence id for new operation');
            }
            this.immutable = false;
            this.xCache = args.xCache;
        }
    };

    /**
     * Serializes the operation as an array of values for transmission.
     *
     * @return {Object[]} Array with the name of the operation type and all
     * of its instance variables as primitive JS types
     */
    Operation.prototype.getState = function() {
        // use an array to minimize the wire format
        var arr = [this.type, this.key, this.value, this.position, 
            this.contextVector.sites, this.seqId, this.siteId,
            this.order];
        return arr;
    };

    /**
     * Unserializes operation data and sets it as the instance data. Throws an
     * exception if the state is not from an operation of the same type.
     *
     * @param {Object[]} arr Array in the format returned by getState
     */
    Operation.prototype.setState = function(arr) {
        if(arr[0] !== this.type) {
            throw new Error('setState invoked with state from wrong op type');
        }
        // name args as required by constructor
        this.key = arr[1];
        this.value = arr[2];
        this.position = arr[3];
        this.contextVector = new ContextVector({state : arr[4]});
        this.seqId = arr[5];
        this.siteId = arr[6];
        this.order = arr[7];
    };

    /**
     * Makes a copy of this operation object. Takes a shortcut and returns
     * a ref to this instance if the op is marked as mutable.
     *
     * @returns {Operation} Operation object
     */
    Operation.prototype.copy = function() {
        if(!this.immutable) {
            return this;
        }
        var args = {
            siteId : this.siteId,
            seqId : this.seqId,
            contextVector : this.contextVector.copy(),
            key : this.key,
            value : this.value,
            position : this.position,
            order : this.order,
            // reference existing xCache
            xCache : this.xCache
        };
        // respect subclasses
        var op = new this.constructor(args);
        return op;
    };

    /**
     * Gets a version of the given operation previously transformed into the
     * given context if available.
     *
     * @param {ContextVector} cv Context of the transformed op to seek
     */
    Operation.prototype.getFromCache = function(cv) {
        // check if the cv is a key in the xCache
        return this.xCache.byContext[cv.toString()];
    };

    /**
     * Caches a transformed copy of this original operation for faster future
     * transformations.
     *
     * @param {Operation} xop Transformed op to cache
     * @param {Number} Integer count of active sites, including the local one
     */
    Operation.prototype.addToCache = function(xop, siteCount) {
        // pull some refs local
        var cache = this.xCache,
            bo = cache.byOrder,
            bcv = cache.byContext;

        // check the count of cached ops against number of sites
        // really +1 for the op to add but -1 for this site
        var diff = bo.length - siteCount;
        if(diff > 0) {
            // if overflow, remove oldest op(s)
            cache.byOrder = bo = bo.slice(diff);
        }
        // add new transformed op
        bcv[xop.contextVector.toString()] = xop;
        bo.push(xop);
        // mark op as immutable because it's in the history
        xop.immutable = true;
    };


    /**
     * Computes an ordered comparison of this op and another based on their
     * context vectors. Used for sorting operations by their contexts.
     *
     * @param {Operation} op Other operation
     * @returns {Number} -1 if this op is ordered before the other, 0 if they
     * are in the same context, and 1 if this op is ordered after the other
     */
    Operation.prototype.compareByContext = function(op) {
        var rv = this.contextVector.compare(op.contextVector);
        if(rv === 0) {
            if(this.siteId < op.siteId) {
                return -1;
            } else if(this.siteId > op.siteId) {
                return 1;
            } else {
                return 0;
            }
        }
        return rv;
    };
    
    /**
     * Computes an ordered comparison of this op and another based on their
     * position in the total op order.
     *
     * @param {Operation} op Other operation
     * @returns {Number} -1 if this op is ordered before the other, 0 if they
     * are in the same context, and 1 if this op is ordered after the other
     */
    Operation.prototype.compareByOrder = function(op) {
        if(this.order === op.order) {
            // both unknown total order, so compare sequence ids; implies both
            // are from the same site or from a site that seeded this one
            // when it was late-joining; either way seq id should match total
            // order from the server
            return this.seqId < op.seqId ? -1 : 1;
        } else if(this.order < op.order) {
            return -1;
        } else if(this.order > op.order) {
            return 1;
        }
    };

    /**
     * Gets the name of the method to use to transform this operation with
     * another based on the type of this operation defined by a subclass.
     *
     * Abstract implementation always throws an exception if not overriden.
     */ 
    Operation.prototype.transformMethod = function() {
        throw new Error('transformMethod not implemented');
    };

    /**
     * Transforms this operation to include the effects of an update operation.
     *
     * Abstract implementation always throws an exception if not overriden.
     *
     * @param {UpdateOperation} op Update to include in this op
     * @returns {Operation} This operation
     */ 
    Operation.prototype.transformWithUpdate = function(op) {
        throw new Error('transformWithUpdate not implemented');
    };

    /**
     * Transforms this operation to include the effects of an insert operation.
     *
     * Abstract implementation always throws an exception if not overriden.
     *
     * @param {InsertOperation} op Update to include in this op
     * @returns {Operation} This operation
     */ 
    Operation.prototype.transformWithInsert = function(op) {
        throw new Error('transformWithInsert not implemented');
    };

    /**
     * Transforms this operation to include the effects of a delete operation.
     *
     * Abstract implementation always throws an exception if not overriden.
     *
     * @param {DeleteOperation} op Update to include in this op
     * @returns {Operation|null} This operation or null if this op can have
     * no further affect on other ops
     */ 
    Operation.prototype.transformWithDelete = function(op) {
        throw new Error('transformWithDelete not implemented');
    };

    return Operation;
});
