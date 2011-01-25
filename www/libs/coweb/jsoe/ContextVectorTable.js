//
// Table of context vectors of known sites.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
dojo.provide('coweb.jsoe.ContextVectorTable');
dojo.require('coweb.jsoe.ContextVector');

/**
 * Stores the context of each site known at this site.
 *
 * @ivar cvt Array of context vectors
 */
dojo.declare('coweb.jsoe.ContextVectorTable', null, {
    /**
     * Initializes the table to include the given context vector at the given
     * site index. Ensures the table has enough empty context vectors up to
     * the given site index.
     * 
     * @param cv Context vector object
     * @param index Integer site ID index into the table
     */
    constructor: function(cv, index) {
        this.cvt = [];
        this.growTo(index+1);
        this.cvt[index] = cv;
    },

    /**
     * Converts the contents of this context vector table to a string.
     *
     * @return String for debugging
     */
    toString: function() {
        var arr = dojo.map(this.cvt, function(cv) { return cv.toString(); });
        return arr.toString();
    },

    /**
     * Gets the index of each entry in the table referencing the given context
     * vector, not counting the index given as skip.
     *
     * @param cv Context vector instance
     * @param skip Integer index to skip
     * @return Array of integer indices
     */
    getEquivalents: function(cv, skip) {
        var equiv = [];
        for(var i=0; i < this.cvt.length; i++) {
            if(i != skip && this.cvt[i] == cv) {
                equiv.push(i);
            }
        }
        return equiv;
    },

    /**
     * Serializes the state of this context vector table for transmission.
     *
     * @return Array of serialized context vectors
     */
    getState: function() {
        var arr = [];
        for(var i=0; i < this.cvt.length; i++) {
            arr[i] = this.cvt[i].getState();
        }
        return arr;
    },

    /**
     * Unserializes context vector table contents to initialize this intance.
     *
     * @param arr Array in the format returned by getState
     */
    setState: function(arr) {
        // clear out any existing state
        this.cvt = [];
        for(var i=0; i < arr.length; i++) {
            this.cvt[i] = new coweb.jsoe.ContextVector({state : arr[i]});
        }
    },

    /**
     * Increases the size of the context vector table to the given size.
     * Inceases the size of all context vectors in the table to the given size.
     * Initializes new entries with zeroed context vectors
     *
     * @param count Desired integer size
     */
    growTo: function(count) {
        // grow all context vectors
        for(var i=0; i < this.cvt.length; i++) {
            this.cvt[i].growTo(count);
        }
        // add new vectors of proper size
        for(i=this.cvt.length; i < count; i++) {
            var cv = new coweb.jsoe.ContextVector({count : count});
            this.cvt.push(cv);
        }
    },

    /**
     * Gets the context vector for the given site. Grows the table if it does 
     * not include the site yet.
     *
     * @param site Integer site ID
     * @return Context vector instance
     */
    getContextVector: function(site) {
        if(this.cvt.length <= site) {
            // grow to encompass the given site at least
            // this is not necessarily the final desired size...
            this.growTo(site+1);
        }
        return this.cvt[site];
    },

    /**
     * Sets the context vector for the given site. Grows the table if it does
     * not include the site yet.
     *
     * @param site Integer site ID
     * @param cv Context vector instance
     */
    updateWithContextVector: function(site, cv) {
        if(this.cvt.length <= site) {
            // grow to encompass the given site at least
            this.growTo(site+1);
        }
        if(cv.getSize() <= site) {
            // make sure the given cv is of the right size too
            cv.growTo(site+1);
        }
        this.cvt[site] = cv;
    },

    /**
     * Sets the context vector for the given site. Grows the table if it does
     * not include the site yet.
     *
     * @param op Operation with the site ID and context vector instance
     */
    updateWithOperation: function(op) {
        // copy the context vector from the operation
        var cv = op.contextVector.copy();
        // upgrade the cv so it includes the op
        cv.setSeqForSite(op.siteId, op.seqId);
        // store the cv
        this.updateWithContextVector(op.siteId, cv);
    },

    /**
     * Gets the context vector with the minimum sequence number for each site
     * among all context vectors in the table. Gets null if the minimum
     * vector cannot be constructed.
     *
     * @return Context vector or null
     */
    getMinimumContextVector: function() {
        // if table is empty, abort
        if(!this.cvt.length) {
            return null;
        }

        // start with first context vector as a guess of which is minimum
        var mcv = this.cvt[0].copy();

        for(var i=1; i < this.cvt.length; i++) {
            var cv = this.cvt[i];
            // cvt has to equal the max vector size contained within
            for(var site = 0; site < this.cvt.length; site++) {
                var seq = cv.getSeqForSite(site);
                var min = mcv.getSeqForSite(site);
                if(seq < min) {
                    // take smaller of the two sequences numbers for each site
                    mcv.setSeqForSite(site, seq);
                }
            }
        }
        return mcv;
    }
});
