package org.coweb.oe;

import java.util.Arrays;
import java.util.Vector;

public class ContextDifference {
	
	public Vector<Integer> sites;
	public Vector<Integer> seqs;
	
	
	public ContextDifference() {
		this.sites = new Vector<Integer>();
		this.seqs = new Vector<Integer>();
	}
	
	
	/**
     * Adds a range of operations to the difference.
     *
     * @param {Number} site Integer site ID
     * @param {Number} start First integer operation sequence number, inclusive
     * @param {Number} end Last integer operation sequence number, exclusive
     */
    public void addRange(int site, int start, int end) {
        for(int i=start; i < end; i++) {
            this.addSiteSeq(site, i);
        }
    }
    
    /**
     * Adds a single operation to the difference.
     *
     * @param {Number} site Integer site ID
     * @param {Number} seq Integer sequence number
     */
    public void addSiteSeq(int site, int seq) {
        this.sites.addElement(new Integer(site));
        this.seqs.addElement(new Integer(seq));        
    }
    
    /**
     * Gets the histor buffer keys for all the operations represented in this
     * context difference.
     *
     * @return {String[]} Array of keys for HistoryBuffer lookups
     */
    public String[] getHistoryBufferKeys() {
		Vector<String> arr = new Vector<String>();
		int l = this.seqs.size();
        for(int i=0; i < l; i++) {
            String key = Operation.createHistoryKey(this.sites.elementAt(i), 
                this.seqs.elementAt(i));
            arr.addElement(key);
        }
        
        return (String[])arr.toArray();
	}
    
    /**
     * Converts the contents of this context difference to a string.
     *
     * @return {String} All keys in the difference (for debug)
     */
    public String toString() {
        return Arrays.toString(this.getHistoryBufferKeys());
    }
}
