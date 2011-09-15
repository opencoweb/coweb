//
// Context vector representation of application state. Currently, just a state
// vector without undo support.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*jslint white:false, bitwise:true, eqeqeq:true, immed:true, nomen:false, 
  onevar:false, plusplus:false, undef:true, browser:true, devel:true, 
  forin:false, sub:false*/
/*global define*/
define([
    'coweb/jsoe/ContextDifference'
], function(ContextDifference) {
    /**
     * Represents the context in which an operation occurred at a site in 
     * terms of the operation sequence numbers already applied at that site or
     * the state of the document at the time.
     *
     * Initializes the sequence context vector based on the desired size of
     * the vector, an existing context vector, an array of integers from an
     * existing context vector, or the serialized state of an existing context
     * vector. At least one of these must be passed on the args parameter else
     * the constructor throws an exception. The argument properties are checked
     * in the order documented below. The first one encountered is used.
     *
     * @constructor
     * @param {Number} args.count Integer number of vector entries to 
     * initialize to zero
     * @param {ContextVector} args.contextVector Context vector to copy
     * @param {Number[]} args.sites Array from a context vector object to copy
     * @param {Number[]} args.state Array from a serialized context vector 
     * object to reference without copy
     */
    var ContextVector = function(args) {
        if(typeof args.count !== 'undefined') {
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
     * Converts the contents of this context vector sites array to a string.
     *
     * @returns {String} All integers in the vector (for debug)
     */
    ContextVector.prototype.toString = function() {
        return '[' + this.sites.toString() + ']';
    };

    /**
     * Serializes this context vector.
     *
     * @returns {Number[]} Array of integer sequence numbers
     */
    ContextVector.prototype.getState = function() {
        return this.sites;
    };

    /**
     * Makes an independent copy of this context vector.
     *
     * @returns {ContextVector} Copy of this context vector
     */
    ContextVector.prototype.copy = function() {
        return new ContextVector({contextVector : this});
    };

    /**
     * Makes an independent copy of the array in this context vector.
     *
     * @return {Number[]} Copy of this context vector's sites array
     */
    ContextVector.prototype.copySites = function() {
        return this.sites.slice();
    };

    /**
     * Computes the difference in sequence numbers at each site between this
     * context vector and the one provided.
     *
     * @param {ContextVector} cv Other context vector object
     * @returns {ContextDifference} Represents the difference between this
     * vector and the one passed
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
    };
    
    /**
     * Finds the oldest sequence number in the difference in sequence numbers
     * for each site between this context and the one provided.
     *
     * @param {ContextVector} cv Other context vector object
     * @returns {ContextDifference} Represents the oldest difference for each
     * site between this vector and the one passed
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
    };

    /**
     * Increases the size of the context vector to the given size. Initializes
     * new entries with zeros.
     *
     * @param {Number} count Desired integer size of the vector
     */
    ContextVector.prototype.growTo = function(count) {
        for(var i=this.sites.length; i < count; i++) {
            this.sites.push(0);
        }
    };

    /**
     * Gets the sequence number for the given site in this context vector.
     * Grows the vector if it does not include the site yet.
     * 
     * @param {Number} site Integer site ID
     * @returns {Number} Integer sequence number for the site
     */
    ContextVector.prototype.getSeqForSite = function(site) {
        if(this.sites.length <= site) {
            this.growTo(site+1);
        }
        return this.sites[site];
    };

    /**
     * Sets the sequence number for the given site in this context vector.
     * Grows the vector if it does not include the site yet.
     * 
     * @param {Number} site Integer site ID
     * @param {Number} seq Integer sequence number
     */
    ContextVector.prototype.setSeqForSite = function(site, seq) {
        if(this.sites.length <= site) {
            this.growTo(site+1);
        }
        this.sites[site] = seq;
    };

    /**
     * Gets the size of this context vector.
     *
     * @returns {Number} Integer size
     */
    ContextVector.prototype.getSize = function() {
        return this.sites.length;
    };

    /**
     * Determines if this context vector equals the other in terms of the
     * sequence IDs at each site. If the vectors are of different sizes, treats
     * missing entries as suffixed zeros.
     *
     * @param {ContextVector} cv Other context vector
     * @returns {Boolean} True if equal, false if not
     */
    ContextVector.prototype.equals = function(cv) {
        var a = this.sites;
        var b = cv.sites;
        // account for different size vectors
        var max = Math.max(a.length, b.length);
        for(var i=0; i < max; i++) {
            var va = (i < a.length) ? a[i] : 0;
            var vb = (i < b.length) ? b[i] : 0;
            if(va !== vb) {
                return false;
            }
        }
        return true;
    };

    /**
     * Computes an ordered comparison of two context vectors according to the
     * sequence IDs at each site. If the vectors are of different sizes, 
     * treats missing entries as suffixed zeros.
     *
     * @param {ContextVector} cv Other context vector
     * @returns {Number} -1 if this context vector is ordered before the other,
     *   0 if they are equal, or 1 if this context vector is ordered after the
     *   other
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
