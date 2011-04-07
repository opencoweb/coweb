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
     * @param {Boolean} args.immutable True if the op cannot be changed, most
     * likely because it is in a history buffer somewhere
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
            // never local when building from serialized state
            this.local = false;
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
            this.xCache = args.xCache;
            this.local = args.local || false;
        }
        // always mutable to start
        this.immutable = false;
        // define the xcache if not set elsewhere
        if(!this.xCache) {
            this.xCache = [];
        }
        // always mutable to start
        this.immutable = false;
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
        } else if(this.immutable) {
            throw new Error('op is immutable');
        }
        // name args as required by constructor
        this.key = arr[1];
        this.value = arr[2];
        this.position = arr[3];
        this.contextVector = new ContextVector({state : arr[4]});
        this.seqId = arr[5];
        this.siteId = arr[6];
        this.order = arr[7] || Infinity;
    };

    /**
     * Makes a copy of this operation object. Takes a shortcut and returns
     * a ref to this instance if the op is marked as mutable.
     *
     * @returns {Operation} Operation object
     */
    Operation.prototype.copy = function() {
        var args = {
            siteId : this.siteId,
            seqId : this.seqId,
            contextVector : this.contextVector.copy(),
            key : this.key,
            value : this.value,
            position : this.position,
            order : this.order,
            local : this.local,
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
     * @returns {Operation|null} Copy of the transformed operation from the 
     * cache or null if not found in the cache
     */
    Operation.prototype.getFromCache = function(cv) {
        // check if the cv is a key in the xCache
        var cache = this.xCache,
            xop, i, l;
        for(i=0, l=cache.length; i<l; i++) {
            xop = cache[i];
            if(xop.contextVector.equals(cv)) {
                return xop.copy();
            }
        }
        return null;
    };

    /**
     * Caches a transformed copy of this original operation for faster future
     * transformations.
     *
     * @param {Number} Integer count of active sites, including the local one
     */
    Operation.prototype.addToCache = function(siteCount) {
        // pull some refs local
        var cache = this.xCache,
            cop = this.copy();

        // mark copy as immutable
        cop.immutable = true;

        // add a copy of this transformed op to the history
        cache.push(cop);

        // check the count of cached ops against number of sites - 1
        var diff = cache.length - (siteCount-1);
        if(diff > 0) {
            // if overflow, remove oldest op(s)
            cache = cache.slice(diff);
        }
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
            // both unknown total order so next check if both ops are from
            // the same site or if one is from the local site and the other
            // remote
            if(this.local === op.local) {
                // compare sequence ids for local-local or remote-remote order
                return (this.seqId < op.seqId) ? -1 : 1;
            } else if(this.local && !op.local) {
                // this local op must appear after the remote one in the total
                // order as the remote one was included in the late joining 
                // state sent by the remote site to this one meaning it was
                // sent before this site finished joining
                return 1;
            } else if(!this.local && op.local) {
                // same as above, but this op is the remote one now
                return -1;
            }
        } else if(this.order < op.order) {
            return -1;
        } else if(this.order > op.order) {
            return 1;
        }
    };
    
    /**
     * Transforms this operation to include the effects of the operation
     * provided as a parameter IT(this, op). Upgrade the context of this
     * op to reflect the inclusion of the other.
     *
     * @returns {Operation|null} This operation, transformed in-place, or null
     * if its effects are nullified by the transform
     * @throws {Error} If this op to be transformed is immutable or if the
     * this operation subclass does not implement the transform method needed
     * to handle the passed op
     */
    Operation.prototype.transformWith = function(op) {
        if(this.immutable) {
            throw new Error('attempt to transform immutable op');
        }
        var func = this[op.transformMethod()], rv;
        if(!func) {
            throw new Error('operation cannot handle transform with type: '+ op.type);
        }
        // do the transform
        rv = func.apply(this, arguments);
        // check if op effects nullified
        if(rv) {
            // upgrade the context of this op to include the other
            this.contextVector.setSeqForSite(op.siteId, op.seqId);
        }
        return rv;
    };

    /**
     * Gets the name of the method to use to transform this operation with
     * another based on the type of this operation defined by a subclass.
     *
     * Abstract implementation always throws an exception if not overriden.
     */ 
    Operation.prototype.getTransformMethod = function() {
        throw new Error('transformMethod not implemented');
    };

    return Operation;
});
