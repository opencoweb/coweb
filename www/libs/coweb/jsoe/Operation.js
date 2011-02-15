//
// Defines the base class for operations.
//
// @todo: should not be a class; factory with raw JS objects and functions to
//   transform
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
define([
    'coweb/jsoe/ContextVector'
], function(ContextVector) {
    /**
     * Contains information about a local or remote event for transformation.
     *
     * @ivar siteId Integer ID of the site where the operation originated
     * @ivar contextVector Context vector object indicating in what state the
     *   the operation was generated
     * @ivar key String key identifying what property the operation affects
     * @ivar value Arbitrary value that the operation assigned to the property
     * @ivar position Integer position of the 
     * @ivar seqId Integer sequence number of this operation at the site where 
     *   it was generated
     * @ivar origPosition Original position before any transformation
     * @ivar origContextVector Original context before any transformation
     * @ivar immutable True if this op cannot be transformed without a copy
     *
     * Initializes an operation from serialized state or individual props.
     *
     * @param args Object with state containing serialized state or individual
     *   op properties
     */
    var Operation = function(args) {
        if(args === undefined) {
            // abstract
            this.type = null;
            return;
        } else if(args.state) {
            // restore from state alone
            this.setState(args.state);
            // store originals
            this.origPosition = this.position;
            this.origContextVector = this.contextVector.copy();
        } else {
            // use individual properties
            this.siteId = args.siteId;
            this.contextVector = args.contextVector;
            if(args.origContextVector) {
                this.origContextVector = args.origContextVector;
            } else {
                this.origContextVector = this.contextVector.copy();
            }
            this.key = args.key;
            this.value = args.value;
            this.position = args.position;
            if(args.origPosition) {
                this.origPosition = args.origPosition;
            } else {
                this.origPosition = this.position;
            }
            if(args.seqId !== undefined) { 
                this.seqId = args.seqId;
            } else if(this.contextVector) {
                this.seqId = this.contextVector.getSeqForSite(this.siteId) + 1;
            } else {
                throw new Error('missing sequence id for new operation');
            }
            this.immutable = false;
        }
    };

    /**
     * Serializes the operation as an array of values.
     *
     * @return Array with the name of the operation class and all of its 
     *   instance variables as primitive JS types
     */
    Operation.prototype.getState = function() {
        // use an array to minimize the wire format
        var arr = [this.type, this.key, this.value, this.position, 
            this.contextVector.sites, this.seqId, this.siteId];
        return arr;
    };

    /**
     * Unserializes operation data and sets it as the instance data.
     *
     * @param arr Array matching the format of that returned by getState
     */
    Operation.prototype.setState = function(arr) {
        // name args as required by constructor
        this.key = arr[1];
        this.value = arr[2];
        this.position = arr[3];
        console.log(ContextVector);
        this.contextVector = new ContextVector({state : arr[4]});
        this.seqId = arr[5];
        this.siteId = arr[6];
    };

    /**
     * Makes a copy of this operation object.
     *
     * @return Operation object
     */
    Operation.prototype.copy = function() {
        if(!this.immutable) {
            return this;
        }
        var args = {
            siteId : this.siteId,
            seqId : this.seqId,
            origContextVector : this.origContextVector,
            contextVector : this.contextVector.copy(),
            key : this.key,
            value : this.value,
            position : this.position,
            origPosition : this.origPosition
        };
        // respect subclasses
        var op = new this.constructor(args);
        return op;
    };

    /**
     * Compares the context vector of this operation to the context vector
     * of the given operation. Used for sorting operations by their contexts.
     *
     * @param op Operation object to compare with
     */
    Operation.prototype.compare = function(op) {
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
     * Makes a copy of the context vector of this operation.
     *
     * @return Context vector object
     */
    Operation.prototype.copyContextVector = function() {
        return this.contextVector.copy();
    };

    /**
     * Gets the name of the method to use to transform this operation with
     * another based on the type of this operation defined by a subclass.
     *
     * Abstract implementation always throws an exception if not overriden.
     */ 
    Operation.prototype.transformMethod = function() {
        throw Error('transformMethod not implemented');
    };

    /**
     * Transforms this operation to include the effects of an update operation.
     *
     * Abstract implementation always throws an exception if not overriden.
     */ 
    Operation.prototype.transformWithUpdate = function(op) {
        throw Error('transformWithUpdate not implemented');
    };

    /**
     * Transforms this operation to include the effects of an insert operation.
     *
     * Abstract implementation always throws an exception if not overriden.
     */ 
    Operation.prototype.transformWithInsert = function(op) {
        throw Error('transformWithInsert not implemented');
    };

    /**
     * Transforms this operation to include the effects of a delete operation.
     *
     * Abstract implementation always throws an exception if not overriden.
     */ 
    Operation.prototype.transformWithDelete = function(op) {
        throw Error('transformWithDelete not implemented');
    };

    return Operation;
});
