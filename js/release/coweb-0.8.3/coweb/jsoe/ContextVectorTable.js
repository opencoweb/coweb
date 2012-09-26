//
// Table of context vectors of known sites.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*jslint white:false, bitwise:true, eqeqeq:true, immed:true, nomen:false, 
  onevar:false, plusplus:false, undef:true, browser:true, devel:true, 
  forin:false, sub:false*/
/*global define*/
define([
    'coweb/jsoe/ContextVector'
], function(ContextVector) {
    /**
     * Stores the context of each site known at this site.
     *
     * Initializes the table to include the given context vector at the given
     * site index. Ensures the table has enough empty context vectors up to
     * the given site ID.
     *
     * Supports the freezing and unfreezing of slots in the table as the
     * corresponding sites start and stop participating in operational 
     * transformation.
     *
     * @constructor
     * @param {ContextVector} Context vector to store in the table at the
     * given index
     * @param {Number} index Integer site ID representing the index at which to
     * store the initial context vector
     */
    var ContextVectorTable = function(cv, site) {
        this.cvt = [];
        this.growTo(site+1);
        this.cvt[site] = cv;        
    };
    
    /**
     * Converts the contents of this context vector table to a string.
     *
     * @return {String} All context vectors in the table (for debug)
     */
    ContextVectorTable.prototype.toString = function() {
        var arr = [];
        for(var i = 0, l = this.cvt.length; i < l; ++i) {
            var cv = this.cvt[i];
            arr[i] = cv.toString();
        }
        return arr.toString();
    };

    /**
     * Gets the index of each entry in the table frozen to (i.e., sharing a 
     * reference with, the given context vector, skipping the one noted in the 
     * skip param.
     *
     * @param {ContextVector} cv Context vector instance
     * @param {Number} skip Integer index to skip
     * @returns {Number[]} Integer indices of table slots referencing the
     * context vector
     */
    ContextVectorTable.prototype.getEquivalents = function(cv, skip) {
        var equiv = [];
        for(var i=0, l=this.cvt.length; i < l; i++) {
            if(i !== skip && this.cvt[i] === cv) {
                equiv.push(i);
            }
        }
        return equiv;
    };

    /**
     * Serializes the state of this context vector table for transmission.
     *
     * @returns {Array[]} Array of context vectors serialized as arrays
     */
    ContextVectorTable.prototype.getState = function() {
        var arr = [];
        for(var i=0, l=this.cvt.length; i < l; i++) {
            arr[i] = this.cvt[i].getState();
        }
        return arr;
    };

    /**
     * Unserializes context vector table contents to initialize this intance.
     *
     * @param {Array[]} arr Array in the format returned by getState
     */
    ContextVectorTable.prototype.setState = function(arr) {
        // clear out any existing state
        this.cvt = [];
        for(var i=0, l=arr.length; i < l; i++) {
            this.cvt[i] = new ContextVector({state : arr[i]});
        }
    };

    /**
     * Increases the size of the context vector table to the given size.
     * Inceases the size of all context vectors in the table to the given size.
     * Initializes new entries with zeroed context vectors.
     *
     * @param {Number} count Desired integer size
     */
    ContextVectorTable.prototype.growTo = function(count) {
        // grow all context vectors
        for(var i=0, l=this.cvt.length; i < l; i++) {
            this.cvt[i].growTo(count);
        }
        // add new vectors of proper size
        for(i=this.cvt.length; i < count; i++) {
            var cv = new ContextVector({count : count});
            this.cvt.push(cv);
        }
    };

    /**
     * Gets the context vector for the given site. Grows the table if it does 
     * not include the site yet and returns a zeroed context vector if so.
     *
     * @param {Number} site Integer site ID
     * @returns {ContextVector} Context vector for the given site
     */
    ContextVectorTable.prototype.getContextVector = function(site) {
        if(this.cvt.length <= site) {
            // grow to encompass the given site at least
            // this is not necessarily the final desired size...
            this.growTo(site+1);
        }
        return this.cvt[site];
    };

    /**
     * Sets the context vector for the given site. Grows the table if it does
     * not include the site yet.
     *
     * @param {Number} site Integer site ID
     * @param {ContextVector} cv Context vector instance
     */
    ContextVectorTable.prototype.updateWithContextVector = function(site, cv) {
        if(this.cvt.length <= site) {
            // grow to encompass the given site at least
            this.growTo(site+1);
        }
        if(cv.getSize() <= site) {
            // make sure the given cv is of the right size too
            cv.growTo(site+1);
        }
        this.cvt[site] = cv;
    };

    /**
     * Sets the context vector for the site on the given operation. Grows the 
     * table if it does not include the site yet.
     *
     * @param {Operation} op Operation with the site ID and context vector
     */
    ContextVectorTable.prototype.updateWithOperation = function(op) {
        // copy the context vector from the operation
        var cv = op.contextVector.copy();
        // upgrade the cv so it includes the op
        cv.setSeqForSite(op.siteId, op.seqId);
        // store the cv
        this.updateWithContextVector(op.siteId, cv);
    };

    /**
     * Gets the context vector with the minimum sequence number for each site
     * among all context vectors in the table. Gets null if the minimum
     * vector cannot be constructed because the table is empty.
     *
     * @returns {ContextVector|null} Minium context vector
     */
    ContextVectorTable.prototype.getMinimumContextVector = function() {
        // if table is empty, abort
        if(!this.cvt.length) {
            return null;
        }

        // start with first context vector as a guess of which is minimum
        var mcv = this.cvt[0].copy();

        for(var i=1, l=this.cvt.length; i < l; i++) {
            var cv = this.cvt[i];
            // cvt has to equal the max vector size contained within
            for(var site = 0; site < l; site++) {
                var seq = cv.getSeqForSite(site);
                var min = mcv.getSeqForSite(site);
                if(seq < min) {
                    // take smaller of the two sequences numbers for each site
                    mcv.setSeqForSite(site, seq);
                }
            }
        }
        return mcv;
    };

    return ContextVectorTable;
});
