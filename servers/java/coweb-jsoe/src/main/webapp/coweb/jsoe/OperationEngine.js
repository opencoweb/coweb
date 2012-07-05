//
// Operation engine public API.
//
// @todo: refactor ops to IT funcs on std objects for performance
// 
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*jslint white:false, bitwise:true, eqeqeq:true, immed:true, nomen:false, 
  onevar:false, plusplus:false, undef:true, browser:true, devel:true, 
  forin:false, sub:false*/
/*global define*/
define([
    'coweb/jsoe/ContextVectorTable',
    'coweb/jsoe/ContextVector',
    'coweb/jsoe/HistoryBuffer',
    'coweb/jsoe/factory',
	'org/requirejs/i18n!./nls/messages',
    // load subclasses to get them registered with the factory
    'coweb/jsoe/UpdateOperation',
    'coweb/jsoe/InsertOperation',
    'coweb/jsoe/DeleteOperation'
], function(ContextVectorTable, ContextVector, HistoryBuffer, factory, messages) {
    /**
     * Controls the operational transformation algorithm. Provides a public
     * API for operation processing, garbage collection, and engine 
     * synchronization.
     *
     * @constructor
     * @param {Number} siteId Unique integer site ID for this engine instance
     */
    var OperationEngine = function(siteId) {
        this.siteId = siteId;
        this.cv = new ContextVector({count : siteId+1});
        this.cvt = new ContextVectorTable(this.cv, siteId);
        this.hb = new HistoryBuffer();
        this.siteCount = 1;
    };

    /**
     * Gets the state of this engine instance to seed a new instance.
     *
     * @return {Object[]} Array or serialized state
     */
    OperationEngine.prototype.getState = function() {
        // op engine state can be cloned from cvt, hb, site ID, and frozen slots
        // get indices of frozen cvt slots
        var frozen = this.cvt.getEquivalents(this.cv, this.siteId);
        return [this.cvt.getState(), this.hb.getState(), this.siteId, frozen];
    };
    
    /**
     * Sets the state of this engine instance to state received from another
     * instance.
     *
     * @param {Object[]} arr Array in the format returned by getState
     */
    OperationEngine.prototype.setState = function(arr) {
        // configure the history buffer and context vector table
        this.cvt.setState(arr[0]);
        this.hb.setState(arr[1]);
        // pull out the context vector for the sending site
        this.cv = this.cvt.getContextVector(arr[2]);
        // copy it
        this.cv = this.cv.copy();
        // freeze our own site slot
        this.cvt.updateWithContextVector(this.siteId, this.cv);
        // set the initial count of active sites; freeze below will adjust
        this.siteCount = this.cv.getSize();
        // freeze all sites that must be frozen
        var frozen = arr[3];
        for(var i=0, l=frozen.length; i < l; i++) {
            this.freezeSite(frozen[i]);
        }
    };

    /**
     * Makes a copy of the engine context vector representing the local 
     * document state.
     *
     * @returns {ContextVector} Copy of the context vector for the local site
     */
    OperationEngine.prototype.copyContextVector = function() {
        return this.cv.copy();
    };

    /**
     * Factory method that creates an operation object initialized with the
     * given values.
     *
     * @param {Boolean} local True if the operation was originated locally, 
     * false if not
     * @param {String} key Operation key
     * @param {String} value Operation value
     * @param {String} type Type of operation: update, insert, delete
     * @param {Number} position Operation integer position
     * @param {Number} site Integer site ID where a remote op originated. 
     * Ignored for local operations which adopt the local site ID.
     * @param {ContextVector} cv Operation context. Ignored for local
     * operations which adopt the local site context.
     * @param {Number} order Place of the operation in the total order. Ignored
     * for local operations which are not yet assigned a place in the order.
     * @returns {Operation} Subclass instance matching the given type
     */
    OperationEngine.prototype.createOp = function(local, key, value, type, 
    position, site, cv, order) {
        var args;
        if(local) {
            args = {
                key : key,
                position : position,
                value : value,
                siteId : this.siteId,
                contextVector : this.copyContextVector(),
                local : true
            };
        } else {
            // build cv from raw sites array
            cv = new ContextVector({sites : cv});
            args = {
                key : key,
                position : position,
                value : value,
                siteId : site,
                contextVector : cv,
                order : order,
                local : false
            };
        }
        return factory.createOperationFromType(type, args);
    };

    /**
     * Creates an operation object and pushes it into the operation engine
     * algorithm. The parameters and return value are the same as those
     * documented for createOp.
     */
    OperationEngine.prototype.push = function(local) {
        var op = this.createOp.apply(this, arguments);
        if(local) {
            return this.pushLocalOp(op);
        } else {
            return this.pushRemoteOp(op);
        }
    };

    /**
     * Procceses a local operation and adds it to the history buffer.
     *
     * @param {Operation} Local operation
     * @returns {Operation} Reference to the pass parameter
     */
    OperationEngine.prototype.pushLocalOp = function(op) {
        // update local context vector
        this.cv.setSeqForSite(op.siteId, op.seqId);
        // add to history buffer
        this.hb.addLocal(op);
        return op;
    };

    /**
     * Procceses a remote operation, transforming it if required, and adds
     * the original to the history buffer.
     *
     * @param {Operation} Remote operation
     * @returns {Operation|null} New, transformed operation object or null if
     * the effect of the passed operation is nothing and should not be applied
     * to the shared state
     */
    OperationEngine.prototype.pushRemoteOp = function(op) {
        var top = null;

        if(this.hasProcessedOp(op)) {
            // let the history buffer track the total order for the op
            this.hb.addRemote(op);
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
        this.hb.addRemote(op);
        // update context vector table with original op
        this.cvt.updateWithOperation(op);

        // return the transformed op
        return top;
    };

    /**
     * Processes an engine synchronization event.
     *
     * @param {Number} site Integer site ID of where the sync originated
     * @param {ContextVector} cv Context vector sent by the engine at that site
     */
    OperationEngine.prototype.pushSync = function(site, cv) {
        // update the context vector table
        this.cvt.updateWithContextVector(site, cv);
    };

    /**
     * Processes an engine synchronization event.
     *
     * @param {Number} site Integer site ID of where the sync originated
     * @param {Number[]} Array form of the context vector sent by the site
     */
    OperationEngine.prototype.pushSyncWithSites = function(site, sites) {
        // build a context vector from raw site data
        var cv = new ContextVector({state : sites});
        this.pushSync(site, cv);
    };

    /**
     * Runs the garbage collection algorithm over the history buffer.
     *
     * @returns {ContextVector|null} Compiuted minimum context vector of the
     * earliest operation garbage collected or null if garbage collection
     * did not run
     */
    OperationEngine.prototype.purge = function() {
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
            // if we haven't picked a minimum op yet OR
            // the current op is before the minimum op in context
            if(min_op === undefined || curr.compareByContext(min_op) === -1) {
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
        ops = this.hb.getContextSortedOperations();
        // remove keys until we hit the min
        for(var i=0; i < ops.length; i++) {
            var op = ops[i];
            // if there is no minimum op OR
            // if this op is not the minimium
            if(min_op === undefined || 
               (min_op.siteId !== op.siteId || min_op.seqId !== op.seqId)) {
                // remove operation from history buffer
                this.hb.remove(op);
            } else {
                // don't remove any more ops with context greater than or 
                // equal to the minimum
                break;
            }
        }
        return mcv;
    };

    /**
     * Gets the size of the history buffer in terms of stored operations.
     * 
     * @returns {Number} Integer size
     */
    OperationEngine.prototype.getBufferSize = function() {
        return this.hb.getCount();
    };

    /**
     * Gets if the engine has already processed the give operation based on
     * its context vector and the context vector of this engine instance.
     *
     * @param {Operation} op Operation to check
     * @returns {Boolean} True if the engine already processed this operation,
     * false if not
     */
    OperationEngine.prototype.hasProcessedOp = function(op) {
        var seqId = this.cv.getSeqForSite(op.siteId);
        // console.log('op processed? %s: this.cv=%s, seqId=%d, op.siteId=%d, op.cv=%s, op.seqId=%d',
        //     (seqId >= op.seqId), this.cv.toString(), seqId, op.siteId, op.contextVector.toString(), op.seqId);
        return (seqId >= op.seqId);
    };

    /**
     * Freezes a slot in the context vector table by inserting a reference
     * to context vector of this engine. Should be invoked when a remote site
     * stops participating.
     *
     * @param {Number} site Integer ID of the site to freeze
     */
    OperationEngine.prototype.freezeSite = function(site) {
        // ignore if already frozen
        if(this.cvt.getContextVector(site) !== this.cv) {
            // insert a ref to this site's cv into the cvt for the given site
            this.cvt.updateWithContextVector(site, this.cv);
            // one less site participating now
            this.siteCount--;
        }
    };

    /**
     * Thaws a slot in the context vector table by inserting a zeroed context
     * vector into the context vector table. Should be invoked before 
     * processing the first operation from a new remote site.
     *
     * @param {Number} site Integer ID of the site to thaw
     */
    OperationEngine.prototype.thawSite = function(site) {
        // don't ever thaw the slot for our own site
        if(site === this.siteId) {return;}
        // get the minimum context vector
        var cv = this.cvt.getMinimumContextVector();
        // grow it to include the site if needed
        cv.growTo(site);
        // use it as the initial context of the site
        this.cvt.updateWithContextVector(site, cv);
        // one more site participating now
        this.siteCount++;
    };
    
    /**
     * Gets the number of sites known to be participating, including this site.
     *
     * @returns {Number} Integer count
     */
    OperationEngine.prototype.getSiteCount = function() {
        return this.siteCount;
    };

    /**
     * Executes a recursive step in the operation transformation control 
     * algorithm. This method assumes it will NOT be called if no 
     * transformation is needed in order to reduce the number of operation
     * copies needed.
     *
     * @param {Operation} op Operation to transform
     * @param {ContextDifference} cd Context vector difference between the 
     * given op and the document state at the time of this recursive call
     * @returns {Operation|null} A new operation, including the effects of all 
     * of the operations in the context difference or null if the operation 
     * can have no further effect on the document state
     */
    OperationEngine.prototype._transform = function(op, cd) {
        // get all ops for context different from history buffer sorted by
        //   context dependencies
        var ops = this.hb.getOpsForDifference(cd),
            xcd, xop, cxop, cop, i, l;
        // copy the incoming operation to avoid disturbing the history buffer
        //   when the op comes from our history buffer during a recursive step
        op = op.copy();
        // iterate over all operations in the difference
        for(i=0, l=ops.length; i < l; i++) {
            // xop is the previously applied op
            xop = ops[i];
            if(!op.contextVector.equals(xop.contextVector)) {
                // see if we've cached a transform of this op in the desired
                // context to avoid recursion
                cxop = xop.getFromCache(op.contextVector);
                // cxop = null;
                if(cxop) {
                    xop = cxop;
                } else {                
                    // transform needed to upgrade context of xop to op
                    xcd = op.contextVector.subtract(xop.contextVector);
                    if(!xcd.sites.length) {
                        throw new Error(messages.emptycontextdiff);
                    }
                    // we'll get a copy back from the recursion
                    cxop = this._transform(xop, xcd);
                    if(cxop === null) {
                        // xop was invalidated by a previous op during the 
                        // transform so it has no effect on the current op; 
                        // upgrade context immediately and continue with
                        // the next one
                        op.upgradeContextTo(xop);
                        // @todo: see null below
                        continue;
                    }
                    // now only deal with the copy
                    xop = cxop;
                }
            }
            if(!op.contextVector.equals(xop.contextVector)) {
                throw new Error(messages.vectorsunequal);
            }
            // make a copy of the op as is before transform
            cop = op.copy();            
            // transform op to include xop now that contexts match IT(op, xop)
            op = op.transformWith(xop);
            if(op === null) {
                // op target was deleted by another earlier op so return now
                // do not continue because no further transforms have any
                // meaning on this op
                // @todo: i bet we want to remove this shortcut if we're
                //   deep in recursion when we find a dead op; instead cache it
                //   so we don't come down here again
                return null;
            }
            // cache the transformed op
            op.addToCache(this.siteCount);

            // do a symmetric transform on a copy of xop too while we're here
            xop = xop.copy();
            xop = xop.transformWith(cop);
            if(xop) {
                xop.addToCache(this.siteCount);
            }
        }
        // op is always a copy because we never entered this method if no
        // transform was needed
        return op;
    };
    
    return OperationEngine;
});
