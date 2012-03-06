package org.coweb.oe;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;

public class ContextVectorTable {
	
	private ArrayList<ContextVector> cvt;
	
	public ContextVectorTable(ContextVector cv, int site) throws OperationEngineException {
		this.cvt = new ArrayList<ContextVector>();
		this.growTo(site + 1);
		this.cvt.set(site, cv);
	}
	
	/**
     * Converts the contents of this context vector table to a string.
     *
     * @return {String} All context vectors in the table (for debug)
     */
	@Override
    public String toString() {
        String[] arr = new String[this.cvt.size()];
        int l = this.cvt.size();
        for(int i = 0; i < l; i++) {
            ContextVector cv = this.cvt.get(i);
            arr[i] = cv.toString();
        }
        return Arrays.toString(arr);
    }
    
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
    public int[] getEquivalents(ContextVector cv, int skip) {
		
		ArrayList<Integer> equiv = new ArrayList<Integer>();
		
		int l = this.cvt.size();
		
		for(int i=0; i<l; i++) {
			if(i != skip && this.cvt.get(i).equals(cv)) {
				equiv.add(new Integer(i));
			}
		}
		
		int[] ret = new int[equiv.size()];
		int index = 0;
		for(Integer i : equiv) {
			ret[index] = i.intValue();
			index++;
		}
		
		return ret;
	}
    
    /**
     * Serializes the state of this context vector table for transmission.
     *
     * @returns {Array[]} Array of context vectors serialized as arrays
     */
	public int[][] getState() {
		int l = this.cvt.size();
		int[][] arr = new int[l][];
		
        for(int i=0; i < l; i++) {
        	ContextVector cv = this.cvt.get(i);
        	
            arr[i] = cv.getState();
        }
        return arr;
	}
	
	/**
     * Unserializes context vector table contents to initialize this intance.
     *
     * @param {Array[]} arr Array in the format returned by getState
	 * @throws OperationEngineException 
     */
	public void setState(int[][] arr) throws OperationEngineException {
		
		this.cvt = new ArrayList<ContextVector>(arr.length);
		
		for(int i=0; i<arr.length; i++) {
			HashMap<String, Object> args = new HashMap<String, Object>();
			args.put("state", arr[i]);
			this.cvt.add(new ContextVector(args));
		}
		
	}
	
	/**
     * Increases the size of the context vector table to the given size.
     * Inceases the size of all context vectors in the table to the given size.
     * Initializes new entries with zeroed context vectors.
     *
     * @param {Number} count Desired integer size
	 * @throws OperationEngineException 
     */
    public void growTo(int count) throws OperationEngineException {
    	int l = cvt.size();
    	
    	// grow all context vectors
        for(int i=0; i < l; i++) {
            this.cvt.get(i).growTo(count);
        }
        
        // add new vectors of proper size
        for(int j=l; j < count; j++) {
        	HashMap<String, Object>args = new HashMap<String, Object>();
        	args.put("count", count);
            ContextVector cv = new ContextVector(args);
            this.cvt.add(cv);
        }
    }
	
    /**
     * Gets the context vector for the given site. Grows the table if it does 
     * not include the site yet and returns a zeroed context vector if so.
     *
     * @param {Number} site Integer site ID
     * @throws OperationEngineException 
     * @returns {ContextVector} Context vector for the given site
     */
	public ContextVector getContextVector(int site) throws OperationEngineException {
		if(this.cvt.size() <= site) {
			// grow to encompass the given site at least
			// this is not necessarily the final desired size...
			this.growTo(site+1);
		}
		return this.cvt.get(site);
	}

	/**
     * Sets the context vector for the given site. Grows the table if it does
     * not include the site yet.
     *
     * @param {Number} site Integer site ID
     * @param {ContextVector} cv Context vector instance
	 * @throws OperationEngineException 
     */
	public void updateWithContextVector(int site, ContextVector cv) throws OperationEngineException {
        if(this.cvt.size() <= site) {
            // grow to encompass the given site at least
            this.growTo(site+1);
        }
        if(cv.getSize() <= site) {
            // make sure the given cv is of the right size too
            cv.growTo(site+1);
        }
        this.cvt.set(site, cv);
	}

	/**
	 * Sets the context vector for the site on the given operation. Grows the 
	 * table if it does not include the site yet.
	 *
	 * @param {Operation} op Operation with the site ID and context vector
	 * @throws OperationEngineException 
	 */
	public void updateWithOperation(Operation op) throws OperationEngineException {
	    // copy the context vector from the operation
        ContextVector cv = op.getContextVector().copy();
        // upgrade the cv so it includes the op
        cv.setSeqForSite(op.siteId, op.seqId);
        // store the cv
        this.updateWithContextVector(op.siteId, cv);
	}
	
	/**
     * Gets the context vector with the minimum sequence number for each site
     * among all context vectors in the table. Gets null if the minimum
     * vector cannot be constructed because the table is empty.
	 * @throws OperationEngineException 
     *
     * @returns {ContextVector|null} Minium context vector
     */
	public ContextVector getMinimumContextVector() throws OperationEngineException {
		// if table is empty, abort
        if(this.cvt == null || this.cvt.size() == 0) {
            return null;
        }

        // start with first context vector as a guess of which is minimum
        ContextVector mcv = this.cvt.get(0).copy();
        int l = this.cvt.size();
        
        for(int i=1; i < l; i++) {
            ContextVector cv = this.cvt.get(i);
            // cvt has to equal the max vector size contained within
            for(int site = 0; site < l; site++) {
                int seq = cv.getSeqForSite(site);
                int min = mcv.getSeqForSite(site);
                if(seq < min) {
                    // take smaller of the two sequences numbers for each site
                    mcv.setSeqForSite(site, seq);
                }
            }
        }
        return mcv;
	}
}
