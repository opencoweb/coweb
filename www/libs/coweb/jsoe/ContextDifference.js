//
// Difference between two contexts in terms of operations.
//
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
dojo.provide('coweb.jsoe.ContextDifference');
dojo.require('coweb.jsoe.HistoryBuffer');

/**
 * Stores the difference in operations between two contexts in terms of site 
 * IDs and sequence numbers.
 *
 * @ivar sites Array of integer site IDs paired with corresponding seq numbers
 * @ivar seqs Array of integer sequence numbers paired with site IDs
 */
dojo.declare('coweb.jsoe.ContextDifference', null, {
    /**
     * Initializes the difference to an empty state.
     */
    constructor: function() {
        this.sites = [];
        this.seqs = [];
    },

    /**
     * Adds a range of operations to the difference.
     *
     * @param site Integer site ID
     * @param start First integer operation sequence number, inclusive
     * @param end Last integer operation sequence number, exclusive
     */
    addRange: function(site, start, end) {
        for(var i=start; i < end; i++) {
            this.addSiteSeq(site, i);
        }
    },

    /**
     * Adds a single operation to the difference.
     *
     * @param site Integer site ID
     * @param seq Integer sequence number
     */
    addSiteSeq: function(site, seq) {
        this.sites.push(site);
        this.seqs.push(seq);        
    },

    /**
     * Gets the histor buffer keys for all the operations represented in this
     * context difference.
     *
     * @return Array of keys
     */
    getHistoryBufferKeys: function() {
        var arr = [];
        for(var i=0; i < this.seqs.length; i++) {
            var key = coweb.jsoe.createHistoryKey(this.sites[i], this.seqs[i]);
            arr.push(key);
        }
        return arr;
    },

    /**
     * Converts the contents of this context difference to a string.
     *
     * @return String for debugging
     */
    toString: function() {
        return this.getHistoryBufferKeys().toString();
    }
});
