//
// Operation engine public API.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
dojo.provide('coweb.jsoe.OperationEngine');
dojo.require('coweb.jsoe.ContextVectorTable');
dojo.require('coweb.jsoe.ContextVector');
dojo.require('coweb.jsoe.HistoryBuffer');
dojo.require('coweb.jsoe.Operation');

/**
 * Controls the operational transformation algorithm. Provides a public
 * API for operation processing, garbage collection, engine synchronization.
 *
 * @ivar siteId Unique site integer for this engine instance in a conference
 * @ivar cv Context vector representing local document state
 * @ivar cvt Context vector table representing all conference document states
 * @ivar hb History buffer of local and remote operations
 * @ivar typeMap Mapping from string op names to op subclasses
 */
dojo.declare('coweb.jsoe.OperationEngine', null, {
    /**
     * Initializes the engine components.
     * 
     * @param site Local site integer to assign to this engine instance
     */
    constructor: function(site) {
        this.siteId = site;
        this.cv = new coweb.jsoe.ContextVector({count : site+1});
        this.cvt = new coweb.jsoe.ContextVectorTable(this.cv, site);
        this.hb = new coweb.jsoe.HistoryBuffer();
    },

    /**
     * Gets the state of this engine instance to seed a new instance.
     *
     * @return Array of cvt state, hb state, local site ID, and indices of
     *   frozen cvt entries
     */
    getState: function() {
        // op engine state can be cloned from cvt, hb, site ID, and frozen slots
        // get indices of frozen cvt slots
        var frozen = this.cvt.getEquivalents(this.cv, this.siteId);
        return [this.cvt.getState(), this.hb.getState(), this.siteId, frozen];
    },

    /**
     * Sets the state of this engine instance to state received from another
     * instance in a conference.
     *
     * @param arr Array of values returned by getState on a remote instance
     */
    setState: function(arr) {
        // configure the history buffer and context vector table
        this.cvt.setState(arr[0]);
        this.hb.setState(arr[1]);
        // pull out the context vector for the sending site
        this.cv = this.cvt.getContextVector(arr[2]);
        // copy it
        this.cv = this.cv.copy();
        // freeze our own site slot
        this.cvt.updateWithContextVector(this.siteId, this.cv);
        // freeze all sites that must be frozen
        var frozen = arr[3];
        for(var i=0; i < frozen.length; i++) {
            this.freezeSite(frozen[i]);
        }
    },

    /**
     * Makes a copy of the engine context vector representing document state.
     *
     * @return Context vector
     */
    copyContextVector: function() {
        return this.cv.copy();
    },

    /**
     * Factory method that creates an operation object initialized with the
     * given values.
     *
     * @param local True if the operation was originated locally, false if not
     * @param key String key identifying what property this op affects
     * @param value Arbitrary new data value associated with the property
     * @param type String type of operation: update, insert, delete
     * @param position Integer position of the property in a linear order
     * @param site Site integer on which the op originated (remote only)
     * @param cv Context vector timestamp for the op (remote only)
     * @return Operation subclass instance matching the given type
     */
    createOp: function(local, key, value, type, position, site, cv) {
        var args;
        if(local) {
            args = {
                key : key,
                position : position,
                value : value,
                siteId : this.siteId,
                contextVector : this.copyContextVector()
            };
        } else {
            // build cv from raw sites array
            cv = new coweb.jsoe.ContextVector({sites : cv});
            args = {
                key : key,
                position : position,
                value : value,
                siteId : site,
                contextVector : cv
            };
        }
        return coweb.jsoe.Operation.createFromType(type, args);
    },

    /**
     * Creates an operation object and pushes it into the operation engine
     * algorithm.
     *
     * @param local True if the operation was originated locally, false if not
     * @param key String key identifying what property this op affects
     * @param value Arbitrary new data value associated with the op
     * @param type String type of operation: update, insert, delete
     * @param position Integer position of the property in a linear order
     * @param site Site integer on which the op originated (remote only)
     * @param cv Context vector timestamp for the op (remote only)
     * @return Original operation if local, transformed operation if remote
     */
    push: function(local, key, value, type, position, site, cv) {
        var op = this.createOp(local, key, value, type, position, site, cv);
        if(local) {
            return this.pushLocalOp(op);
        } else {
            return this.pushRemoteOp(op);
        }
    },

    /**
     * Procceses a local operation.
     *
     * @param op Operation object
     * @return Operation object (same ref as param)
     */
    pushLocalOp: function(op) {
        // update local context vector
        this.cv.setSeqForSite(op.siteId, op.seqId);
        // add to history buffer
        this.hb.add(op);
        return op;
    },

    /**
     * Procceses a remote operation.
     *
     * @param op Operation object
     * @return Transformed operation object (not same ref as param)
     */
    pushRemoteOp: function(op) {
        var top = null;

        if(this.hasProcessedOp(op)) {
            // engine has already processed this op so ignore it
            return null;
        } else if(this.cv.equals(op.contextVector)) {
            // no transform needed
            // make a copy so return value is independent of input
            top = op.copy();
        } else {
            // transform needed to upgrade context
            var cd = this.cv.subtract(op.contextVector);
            // make the original op immutable
            op.immutable = true;
            // top is a transformed copy of the original
            top = this._transform(op, cd);
        }

        // update local context vector with the original op
        this.cv.setSeqForSite(op.siteId, op.seqId);
        // store original op
        this.hb.add(op);
        // update context vector table with original op
        this.cvt.updateWithOperation(op);

        // return the transformed op
        return top;
    },

    /**
     * Processes an engine synchronization event.
     *
     * @param site Integer site ID of where the sync originated
     * @param cv Context vector of that site
     */
    pushSync: function(site, cv) {
        // update the context vector table
        this.cvt.updateWithContextVector(site, cv);
    },

    /**
     * Processes an engine synchronization event.
     *
     * @param site Integer site ID of where the sync originated
     * @param site Array of site sequence values for a context vector
     */
    pushSyncWithSites: function(site, sites) {
        // build a context vector from raw site data
        var cv = new coweb.jsoe.ContextVector({state : sites});
        this.pushSync(site, cv);
    },

    /**
     * Runs the garbage collection algorithm over the history buffer.
     *
     * @return Minimum context vector object or null if gc didn't run
     */
    purge: function() {
        if(this.getBufferSize() === 0) {
            // exit quickly if there is nothing to purge
            return null;
        }
        // get minimum context vector
        var mcv = this.cvt.getMinimumContextVector();
        
        if(mcv === null) {
            // exit quickly if there is no mcv
            return null;
        }

        var min_op; 
        var cd = this.cv.oldestDifference(mcv);
        var ops = this.hb.getOpsForDifference(cd);
        while(ops.length) {
            // get an op from the list we have yet to process
            var curr = ops.pop();
            // if we haven't pick a minimum op yet OR
            // the current op is sorted before minimum op in the hb
            if(min_op === undefined || curr.compare(min_op) == -1) {
                // compute the oldest difference between the document state
                // and the current op
                cd = this.cv.oldestDifference(curr.contextVector);
                // add the operations in this difference to the list to process
                ops = ops.concat(this.hb.getOpsForDifference(cd));
                // make the current op the new minimum
                min_op = curr;
            }
        }

        // get history buffer contents sorted by context dependencies
        ops = this.hb.getSortedOperations();
        // remove keys until we hit the min
        for(var i=0; i < ops.length; i++) {
            var op = ops[i];
            // if there is no minimum op OR
            // if this op is not the minimium
            if(min_op === undefined || 
               (min_op.siteId != op.siteId || min_op.seqId != op.seqId)) {
                // remove operation from history buffer
                this.hb.remove(op);
            } else {
                // don't remove any more ops with context greater than or 
                // equal to the minimum
                break;
            }
        }
        return mcv;
    },

    /**
     * Gets the size of the history buffer in terms of stored operations.
     * 
     * @return Integer size
     */
    getBufferSize: function() {
        return this.hb.getCount();
    },

    /**
     * Gets if the engine has already processed the give operation based on
     * its context vector and the context vector of this engine instance.
     *
     * @param Operation object
     * @return True if already processed, false if not
     */
    hasProcessedOp: function(op) {
        var seqId = this.cv.getSeqForSite(op.siteId);
        return (seqId >= op.seqId);
    },

    /**
     * Freezes a slot in the context vector table by inserting a reference
     * to this engine instance's context vector.
     *
     * @param site Integer ID of the site to freeze
     */
    freezeSite: function(site) {
        // insert a ref to this site's cv into the cvt for the given site
        this.cvt.updateWithContextVector(site, this.cv);
    },

    /**
     * Thaws a slot in the context vector table by inserting an empty context
     * vector into the context vector table.
     *
     * @param site Integer ID of the site to thaw
     */
    thawSite: function(site) {
        // don't ever thaw the slot for our own site
        if(site == this.siteId) {return;}
        // get the minimum context vector
        var cv = this.cvt.getMinimumContextVector();
        // grow it to include the site if needed
        cv.growTo(site);
        // use it as the initial context of the site
        this.cvt.updateWithContextVector(site, cv);
    },

    /**
     * Executes a recursive step in the integration algorithm.
     *
     * @param op Operation to transform
     * @param cd Context vector difference between the given op and another
     *   document state
     * @return Transformed operation (not a ref to the param op)
     */
    _transform: function(op, cd) {
        // get all ops for context different from history buffer sorted by
        //   context dependencies
        var ops = this.hb.getOpsForDifference(cd);
        // copy the incoming operation to avoid disturbing the history buffer
        //   when the op comes from our history buffer during a recursive step
        op = op.copy();
        //iterate over all operations in the difference
        for(var i=0; i < ops.length; i++) {
            // xop is the previously applied op
            var xop = ops[i];
            if(!op.contextVector.equals(xop.contextVector)) {
                // transform needed to upgrade context of xop to op
                var xcd = op.contextVector.subtract(xop.contextVector);
/*                if(!xcd.sites.length) {
                    throw new Error('bad context diff');
                }*/
                // we'll get a copy back from the recursion
                var cxop = this._transform(xop, xcd);
                if(cxop === null) {
                    // xop was invalidated by a previous op during the transform
                    // so it has no effect on the current op; upgrade context
                    // immediately
                    op.contextVector.setSeqForSite(xop.siteId, xop.seqId);
                    continue;
                }
                // now only deal with the copy
                xop = cxop;
            }
/*            if(!op.contextVector.equals(xop.contextVector)) {
                throw new Error('context vectors unequal after upgrade');
            }*/
            // perform the inclusion transform on op and xop now that they have
            //   the same context; ask xop for the method that should be invoked
            //   on op to properly transform it
            op = op[xop.transformMethod()](xop);
            if(op === null) {
                // op target was deleted by another earlier op so return now
                // do not continue because no further transforms have any
                // meaning on this op
                return null;
            }
            // upgrade the context of the transformed op to reflect the
            //   inclusion transform
            op.contextVector.setSeqForSite(xop.siteId, xop.seqId);
        }
        // op is always a copy because we never entered this method if no
        // transform was needed
        return op;
    }
});
