//
// Insert, update, delete operations and their inclusion transformations.
//
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
dojo.provide('coweb.jsoe.Operation');

/**
 * Contains information about a local or remote event for transformation.
 *
 * @ivar siteId Integer ID of the site where the operation originated
 * @ivar contextVector Context vector object indicating in what state the
 *   the operation was generated
 * @ivar key String key identifying what property the operation affects
 * @ivar value Arbitrary value that the operation assigned to the property
 * @ivar position Integer position of the 
 * @ivar seqId Integer sequence number of this operation at the site where it
 *   was generated
 */
dojo.declare('coweb.jsoe.Operation', null, {
    constructor: function(args) {
        if(args.state) {
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
    },

    /**
     * Serializes the operation as an array of values.
     *
     * @return Array with the name of the operation class and all of its 
     *   instance variables as primitive JS types
     */
    getState: function() {
        // use an array to minimize the wire format
        var arr = [this.declaredClass, this.key, this.value, this.position, 
            this.contextVector.sites, this.seqId, this.siteId];
        return arr;
    },

    /**
     * Unserializes operation data and sets it as the instance data.
     *
     * @param arr Array matching the format of that returned by getState
     */
    setState: function(arr) {
        // name args as required by constructor
        this.key = arr[1];
        this.value = arr[2];
        this.position = arr[3];
        this.contextVector = new coweb.jsoe.ContextVector({state : arr[4]});
        this.seqId = arr[5];
        this.siteId = arr[6];
    },

    /**
     * Makes a copy of this operation object.
     *
     * @return Operation object
     */
    copy: function() {
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
        var segs = this.declaredClass.split('.');
        var op = new coweb.jsoe[segs[2]](args);
        return op;
    },

    /**
     * Compares the context vector of this operation to the context vector
     * of the given operation. Used for sorting operations by their contexts.
     *
     * @param op Operation object to compare with
     */
    compare: function(op) {
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
    },

    /**
     * Makes a copy of the context vector of this operation.
     *
     * @return Context vector object
     */
    copyContextVector: function() {
        return this.contextVector.copy();
    },

    /**
     * Gets the name of the method to use to transform this operation with
     * another based on the type of this operation defined by a subclass.
     *
     * Abstract implementation always throws an exception if not overriden.
     */ 
    transformMethod: function() {
        throw Error('transformMethod not implemented');
    },

    /**
     * Transforms this operation to include the effects of an update operation.
     *
     * Abstract implementation always throws an exception if not overriden.
     */ 
    transformWithUpdate: function(op) {
        throw Error('transformWithUpdate not implemented');
    },

    /**
     * Transforms this operation to include the effects of an insert operation.
     *
     * Abstract implementation always throws an exception if not overriden.
     */ 
    transformWithInsert: function(op) {
        throw Error('transformWithInsert not implemented');
    },

    /**
     * Transforms this operation to include the effects of a delete operation.
     *
     * Abstract implementation always throws an exception if not overriden.
     */ 
    transformWithDelete: function(op) {
        throw Error('transformWithDelete not implemented');
    }
});

/**
 * Represents an update operation that replaces the value of one property
 * with another.
 */
dojo.declare('coweb.jsoe.UpdateOperation', coweb.jsoe.Operation, {
    /**
     * Gets the method name to use to transform another operation against this
     * update operation.
     *
     * @return String method name
     */
    transformMethod: function() {
        return 'transformWithUpdate';
    },

    /**
     * Transforms this update to include the effect of an update.
     *
     * @param op UpdateOperation object
     * @return This instance
     */
    transformWithUpdate: function(op) {
        if((op.position != this.position) || (op.key != this.key)) {
            return this;
        }

        if(this.siteId > op.siteId) {
            this.value = op.value;
        } else if((this.siteId == op.siteId) && (this.seqId < op.seqId)) {
            this.value = op.value;
        }
        return this;
    },

    /**
     * Transforms this update to include the effect of an insert.
     *
     * @param op InsertOperation object
     * @return This instance
     */
    transformWithInsert: function(op) {
        if(this.key != op.key) {
            return this;
        }
        if(this.position >= op.position) {
            ++this.position;
        }
        return this;
    },

    /**
     * Transforms this update to include the effect of a delete.
     *
     * @param op DeleteOperation object
     * @return This instance or null
     */
    transformWithDelete: function(op) {
        if(this.key != op.key) {
            return this;
        }
        if(this.position > op.position) {
            --this.position;
        } else if(this.position == op.position) {
            return null;
        }
        return this;
    }
});

/**
 * Represents an insert operation that adds a value to a linear collection.
 */
dojo.declare('coweb.jsoe.InsertOperation', coweb.jsoe.Operation, {
    /**
     * Gets the method name to use to transform another operation against this
     * insert operation.
     *
     * @return String method name
     */
    transformMethod: function() {
        return 'transformWithInsert';
    },

    /**
     * No-op. Update has no effect on an insert.
     *
     * @param op UpdateOperation object
     * @return This instance
     */
    transformWithUpdate: function(op) {
        return this;
    },

    /**
     * Transforms this insert to include the effect of an insert.
     *
     * @param op InsertOperation object
     * @return This instance
     */
    transformWithInsert: function(op) {
        if(this.key != op.key) {
            return this;
        }

        if(this.position > op.position) {
            ++this.position;
        } else if(this.position == op.position) {
            if(this.origPosition > op.origPosition) {
                // adjust local position if other's position is earlier
                ++this.position;
            } else if(this.origPosition == op.origPosition) {
                var rv = this.origContextVector.compare(op.origContextVector);
                if(rv < 0) {
                    // adjust local position if other's original context is later
                    ++this.position;
                } else if(rv == 0 && this.siteId > op.siteId) {
                    ++this.position;
                }
            }
        }
        return this;
    },

    /**
     * Transforms this insert to include the effect of a delete.
     *
     * @param op DeleteOperation object
     * @return This instance or null
     */
    transformWithDelete: function(op) {
        if(this.key != op.key) {
            return this;
        }
        if(this.position > op.position) {
            --this.position;
        }
        return this;
    }
});

/**
 * Represents a delete operation that removes a value from a linear collection.
 */
dojo.declare('coweb.jsoe.DeleteOperation', coweb.jsoe.Operation, {
    /**
     * Gets the method name to use to transform another operation against this
     * delete operation.
     *
     * @return String method name
     */
    transformMethod: function() {
        return 'transformWithDelete';
    },

    /**
     * No-op. Update has no effect on a delete.
     *
     * @param op UpdateOperation object
     * @return This instance
     */
    transformWithUpdate: function(op) {
        return this;
    },

    /**
     * Transforms this delete to include the effect of an insert.
     *
     * @param op InsertOperation object
     * @return This instance
     */
    transformWithInsert: function(op) {
        if(this.key != op.key) {
            return this;
        }
        if(this.position >= op.position) {
            ++this.position;
        }
        return this;
    },

    /**
     * Transforms this delete to include the effect of a delete.
     *
     * @param op DeleteOperation object
     * @return This instance or null
     */
    transformWithDelete: function(op) {
        if(this.key != op.key) {
            return this;
        }
        if(this.position > op.position) {
            --this.position;
        } else if(this.position == op.position) {
            return null;
        }
        return this;
    }
});
