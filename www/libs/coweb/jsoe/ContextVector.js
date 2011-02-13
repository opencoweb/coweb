//
// Context vector representation of application state. Currently, just a state
// vector without undo support.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
define([
    'coweb/jsoe/ContextDifference'
], function(ContextDifference) {
    /**
     * Represents the context in which an operation occurred at a site in 
     * terms of the operation sequence numbers already applied at that site or
     * the state of the document at the time.
     *
     * Initializes the sequence context vector. Throws an exception if no
     * valid initialization parameter is provided.
     *
     * @ivar sites Array of integer sequence numbers for a set of indexed 
     *   sites
     * 
     * @param args Object with properties initializing the context array in 
     *   various ways:
     *   - count: Integer number of vector entries to initialize to zero
     *   - contextVector: Context vector object to copy
     *   - sites: Array from a context vector object to copy
     *   - state: Array from a serialized context vector object to reference
     */
    var ContextVector = function(args) {
        if(typeof args.count != 'undefined') {
            this.sites = [];
            this.growTo(args.count);
        } else if(args.contextVector) {
            this.sites = args.contextVector.copySites();
        } else if(args.sites) {
            this.sites = args.sites.slice();
        } else if(args.state) {
            this.sites = args.state;
        } else {
            throw new Error('uninitialized context vector');
        }        
    };

    /**
     * Converts the contents of this context vector to a string.
     *
     * @return String for debugging
     */
    ContextVector.prototype.toString = function() {
        return '[' + this.sites.toString() + ']';
    },

    /**
     * Serializes this context vector.
     *
     * @return Array of integer sequencen numbers
     */
    ContextVector.prototype.getState = function() {
        return this.sites;
    },

    /**
     * Makes an independent copy of this context vector.
     *
     * @return Context vector copy
     */
    ContextVector.prototype.copy = function() {
        return new ContextVector({contextVector : this});
    },

    /**
     * Makes an independent copy of the array in this context vector.
     *
     * @return Array copy
     */
    ContextVector.prototype.copySites = function() {
        return this.sites.slice();
    },

    /**
     * Computes the difference in sequence numbers at each site between this
     * context vector and the one provided.
     *
     * @param cv Other context vector object
     * @return Context difference object
     */
    ContextVector.prototype.subtract = function(cv) {
        var cd = new ContextDifference();
        for(var i=0; i < this.sites.length; i++) {
            var a = this.getSeqForSite(i);
            var b = cv.getSeqForSite(i);
            if(a-b > 0) {
                cd.addRange(i, b+1, a+1);
            }
        }
        return cd;
    },
    
    /**
     * Finds the oldest sequence number in the difference in sequence numbers
     * for each site between this context and the one provided.
     *
     * @param cv Other context vector object
     * @return Context difference object
     */
    ContextVector.prototype.oldestDifference = function(cv) {
        var cd = new ContextDifference();
        for(var i=0; i < this.sites.length; i++) {
            var a = this.getSeqForSite(i);
            var b = cv.getSeqForSite(i);
            if(a-b > 0) {
                cd.addSiteSeq(i, b+1);
            }
        }
        return cd;
    },

    /**
     * Increases the size of the context vector to the given size. Initializes
     * new entries with zeros.
     *
     * @param count Desired integer size
     */
    ContextVector.prototype.growTo = function(count) {
        for(var i=this.sites.length; i < count; i++) {
            this.sites.push(0);
        }
    },

    /**
     * Gets the sequence number for the given site in this context vector.
     * Grows the vector if it does not include the site yet.
     * 
     * @param site Integer site ID
     * @return Integer sequence number
     */
    ContextVector.prototype.getSeqForSite = function(site) {
        if(this.sites.length <= site) {
            this.growTo(site+1);
        }
        return this.sites[site];
    },

    /**
     * Sets the sequence number for the given site in this context vector.
     * Grows the vector if it does not include the site yet.
     * 
     * @param site Integer site ID
     * @param seq Integer sequence number
     */
    ContextVector.prototype.setSeqForSite = function(site, seq) {
        if(this.sites.length <= site) {
            this.growTo(site+1);
        }
        this.sites[site] = seq;
    },

    /**
     * Gets the size of this context vector.
     */
    ContextVector.prototype.getSize = function() {
        return this.sites.length;
    },

    /**
     * Determines if this context vector equals the other. If the vectors are
     * of different sizes, treats missing entries as zeros.
     *
     * @param cv Context vector instance
     * @return Boolean true if equal, false if not
     */
    ContextVector.prototype.equals = function(cv) {
        var a = this.sites;
        var b = cv.sites;
        // account for different size vectors
        var max = Math.max(a.length, b.length);
        for(var i=0; i < max; i++) {
            var va = (i < a.length) ? a[i] : 0;
            var vb = (i < b.length) ? b[i] : 0;
            if(va != vb) return false;
        }
        return true;
    },

    /**
     * Compares two context vectors. If the v vectors are of different sizes, 
     * treats missing entries as zeros.
     *
     * @param cv Context vector instance
     * @return Integer -1 if this context vector represents a state before
     *   the other, 0 if they are equal, or 1 if this context vector 
     *   represents a state later than the other
     */
    ContextVector.prototype.compare = function(cv) {
        var a = this.sites;
        var b = cv.sites;
        // acount for different size vectors
        var max = Math.max(a.length, b.length);
        for(var i=0; i < max; i++) {
            var va = (i < a.length) ? a[i] : 0;
            var vb = (i < b.length) ? b[i] : 0;            
            if(va < vb) {
                return -1;
            } else if(va > vb) {
                return 1;
            }
        }
        return 0;
    };
    
    return ContextVector;
});
