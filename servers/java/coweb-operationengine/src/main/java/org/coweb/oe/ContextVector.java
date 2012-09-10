package org.coweb.oe;

import java.util.HashMap;
import java.util.Map;
import java.util.Arrays;

public class ContextVector {
	
	private int[] sites;
		
	public ContextVector(Map<String, Object> args) throws OperationEngineException {
		if(args.containsKey("count")) {
			this.sites = new int[((Integer)args.get("count")).intValue()];
		}
		else if(args.containsKey("contextVector")) {
			this.sites = ((ContextVector)args.get("contextVector")).copySites();
		}
		else if(args.containsKey("sites")) {
			int[] s = (int[])args.get("sites");
			this.sites = Arrays.copyOf(s, s.length);
		}
		else if(args.containsKey("state")) {
			this.sites = (int[])args.get("state");
		}
		else {
			throw new OperationEngineException("uninitialized context vector");
		}
	}
	
	/**
     * Converts the contents of this context vector sites array to a string.
     *
     * @return All integers in the vector (for debug)
     */
	@Override
	public String toString() {
		StringBuffer b = new StringBuffer();
		b.append(Arrays.toString(this.sites));
		
		return b.toString();
	}
	
	/**
     * Serializes this context vector.
     *
     * @return Array of integer sequence numbers
     */
	public int[] getState() {
		return this.sites;
	}
	
	
	/**
     * Makes an independent copy of this context vector.
	 * @throws OperationEngineException 
     *
     * @return Copy of this context vector
     */
	public ContextVector copy() throws OperationEngineException {
		
		HashMap<String, Object> args = new HashMap<String, Object>();
		args.put("contextVector", this);
		
		return new ContextVector(args);
	}
	
	/**
     * Makes an independent copy of the array in this context vector.
     *
     * @return Copy of this context vector's sites array
     */
	public int[] copySites() {
		return Arrays.copyOf(this.sites, this.sites.length);
	}
	
	/**
     * Computes the difference in sequence numbers at each site between this
     * context vector and the one provided.
     *
     * @param cv Other context vector object
     * @return Represents the difference between this vector and the one passed
     */
	public ContextDifference subtract(ContextVector cv) {
		ContextDifference cd = new ContextDifference();
        for(int i=0; i < this.sites.length; i++) {
            int a = this.getSeqForSite(i);
            int b = cv.getSeqForSite(i);
            if(a-b > 0) {
                cd.addRange(i, b+1, a+1);
            }
        }
        return cd;
	}
	
	/**
     * Finds the oldest sequence number in the difference in sequence numbers
     * for each site between this context and the one provided.
     *
     * @param cv Other context vector object
     * @return Represents the oldest difference for each
     * site between this vector and the one passed
     */
	public ContextDifference oldestDifference(ContextVector cv) {
		ContextDifference cd = new ContextDifference();
        for(int i=0; i < this.sites.length; i++) {
            int a = this.getSeqForSite(i);
            int b = cv.getSeqForSite(i);
            if(a-b > 0) {
                cd.addSiteSeq(i, b+1);
            }
        }
        return cd;
	}
	
	/**
     * Increases the size of the context vector to the given size. Initializes
     * new entries with zeros.
     *
     * @param count Desired integer size of the vector
     */
	public void growTo(int count) {
		
		System.out.println("growTo before new count = " + count + " old array = " + this.toString());
		int[] newSites = new int[count];
		System.arraycopy(this.sites, 0, newSites, 0, this.sites.length);
		for(int i=this.sites.length; i<count; i++) {
			newSites[i] = 0;
		}

		
		this.sites = newSites;
		
		System.out.println("growTo after = " + this.toString());

	}
	
	/**
     * Gets the sequence number for the given site in this context vector.
     * Grows the vector if it does not include the site yet.
     * 
     * @param site Integer site ID
     * @return Integer sequence number for the site
     */
	public int getSeqForSite(int site) {
		if(this.sites.length <= site) {
            this.growTo(site+1);
        }
        return this.sites[site];
	}
	
	/**
     * Sets the sequence number for the given site in this context vector.
     * Grows the vector if it does not include the site yet.
     * 
     * @param site Integer site ID
     * @param seq Integer sequence number
     */
	public void setSeqForSite(int site, int seq) {	
		if(this.sites.length <= site) {
            this.growTo(site+1);
        }
        this.sites[site] = seq;
	}
	
	/**
     * Gets the size of this context vector.
     *
     * @return Integer size
     */
	public int getSize() {
		return this.sites.length;
	}
	
	/**
     * Determines if this context vector equals the other in terms of the
     * sequence IDs at each site. If the vectors are of different sizes, treats
     * missing entries as suffixed zeros.
     *
     * @param cv Other context vector
     * @return True if equal, false if not
     */
    public boolean equals(ContextVector cv) {
        int[] a = this.sites;
        int[] b = cv.sites;
        
        // account for different size vectors
        int max = Math.max(a.length, b.length);
        for(int i=0; i < max; i++) {
            int va = (i < a.length) ? a[i] : 0;
            int vb = (i < b.length) ? b[i] : 0;
            if(va != vb) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * Computes an ordered comparison of two context vectors according to the
     * sequence IDs at each site. If the vectors are of different sizes, 
     * treats missing entries as suffixed zeros.
     *
     * @param cv Other context vector
     * @return -1 if this context vector is ordered before the other,
     *   0 if they are equal, or 1 if this context vector is ordered after the
     *   other
     */
    public int compare(ContextVector cv) {
        int[] a = this.sites;
        int[] b = cv.sites;
        // acount for different size vectors
        int max = Math.max(a.length, b.length);
        for(int i=0; i < max; i++) {
            int va = (i < a.length) ? a[i] : 0;
            int vb = (i < b.length) ? b[i] : 0;            
            if(va < vb) {
                return -1;
            } else if(va > vb) {
                return 1;
            }
        }
        return 0;
    }
    
    
	public int[] getSites() {
		return this.sites;
	}
	
	
}
