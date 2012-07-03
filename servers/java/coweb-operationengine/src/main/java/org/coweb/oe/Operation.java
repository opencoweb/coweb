package org.coweb.oe;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.Vector;


public abstract class Operation {
	
	protected final static int infinity = 99999999;
	protected int siteId;
	protected int seqId;
	protected String type = null;
	protected boolean local = false;
	protected ContextVector contextVector = null;
	protected String key = null;
	protected String value = null;
	protected int position;
	protected int order;
	protected boolean immutable;
	protected Vector<Operation> xCache = null;
	
	public static Operation createOperationFromType(String type, Map<String, Object> args) throws OperationEngineException  {
		
		Operation op = null;
		
		if(type.equals("insert")) {
			op = new InsertOperation(args);
		}
		else if(type.equals("delete")) {
			op = new DeleteOperation(args);
		}
		else if(type.equals("update")) {
			op = new UpdateOperation(args);
		}
		
		return op;
	}
	
	public static Operation createOperationFromState(Object[] state) throws OperationEngineException {
		return null;
	}
	
	public static String createHistoryKey(int site, int seq) {
		return new Integer(site).toString() + "," + new Integer(seq).toString();
	}
	
	@Override
	public String toString() {
		StringBuffer b = new StringBuffer();
		b.append("{siteId : " + this.siteId);
		b.append(",seqId : " + this.seqId);
		b.append(",type :" + type);
		b.append(",contextVector : " + this.contextVector);
		b.append(",key : " + this.key);
		b.append(",position : " + this.position);
		b.append(",order : " + this.order);
		b.append("}");
		
		return b.toString();
	}
	/**
     * Contains information about a local or remote event for transformation.
     *
     * Initializes the operation from serialized state or individual props if
     * state is not defined in the args parameter.
     *
     * @param args Map containing the following:
	 *        <li>state Array in format returned by getState 
     *            bundling the following individual parameter values
     *        <li>siteId Integer site ID where the op originated
     *        <li>contextVector Context in which the op occurred
     *        <li>key Name of the property the op affected
     *        <li>value Value of the op
     *        <li>position Integer position of the op in a linear collection
     *        <li>order Integer sequence number of the op in the 
     *            total op order across all sites
     *        <li>seqId Integer sequence number of the op at its originating site.
     *            If undefined, computed from the context vector and site ID.
     *        <li>immutable True if the op cannot be changed, most likely because
	 *            it is in a history buffer somewhere to this instance
	 * @throws OperationEngineException 
     */
	@SuppressWarnings("unchecked")
	protected Operation(Map<String, Object> args) throws OperationEngineException {
		if(args == null) {
			this.type = null;
			return;
		}
			
		if(args.containsKey("state")) {
			this.setState((Object[])args.get("state"));
			this.local = false;
		}
		else {
			this.siteId = ((Integer)args.get("siteId")).intValue();
			this.contextVector = (ContextVector)args.get("contextVector");
			this.key = (String)args.get("key");
			this.value = (String)args.get("value");
			this.position = ((Integer)args.get("position")).intValue();
			
			Integer ord = (Integer)args.get("order");
			if(ord == null) {
				this.order = Operation.infinity;
			} else {
				this.order = ord.intValue();
			}
			
			if(args.containsKey("seqId")) {
				this.seqId = ((Integer)args.get("seqId")).intValue();
			}
			else if(this.contextVector != null) {
				this.seqId = this.contextVector.getSeqForSite(this.siteId) + 1; 
			}
			else {
				throw new OperationEngineException("missing sequence id for new operation");
			}
			
			if(args.containsKey("xCache")) {
				this.xCache = (Vector<Operation>)args.get("xCache");
			}
			else {
				this.xCache = null;
			}
			
			this.local = ((Boolean)args.get("local")).booleanValue() || false;
		}
			
		this.immutable = false;
		
		if(this.xCache == null) {
			this.xCache = new Vector<Operation>();
		}
	}
	
	
	public abstract Operation transformWithDelete(Operation op);
	
	public abstract Operation transformWithInsert(Operation op);
	
	public abstract Operation transformWithUpdate(Operation op);
	
	
	/**
     * Serializes the operation as an array of values for transmission.
     *
     * @return {Object[]} Array with the name of the operation type and all
     * of its instance variables as primitive JS types
     */
	public Object[] getState() {
		 // use an array to minimize the wire format
        Object[] arr = {
        		this.type, 
        		this.key, 
        		this.value, 
        		this.position, 
        		this.contextVector.getSites(), 
        		this.seqId, 
        		this.siteId,
        		this.order
        };
        
        return arr;
	}
	
	/**
     * Unserializes operation data and sets it as the instance data. Throws an
     * exception if the state is not from an operation of the same type.
     *
     * @param arr Array in the format returned by getState
	 * @throws OperationEngineException 
     */
	public void setState(Object[] arr) throws OperationEngineException {
		if(!((String)arr[0]).equals(this.type)) {
            throw new OperationEngineException("setState invoked with state from wrong op type");
        } else if(this.immutable) {
            throw new OperationEngineException("op is immutable");
        }
		
        // name args as required by constructor
        this.key = (String)arr[1];
        this.value = (String)arr[2];
        this.position = ((Integer)arr[3]).intValue();
        
        HashMap<String, Object> args = new HashMap<String, Object>();
        args.put("state", (Object[])arr[4]);
        
        this.contextVector = new ContextVector(args);
        
        this.seqId = ((Integer)arr[5]).intValue();
        this.siteId = ((Integer)arr[6]).intValue();
        
        if(arr.length >= 8) {
        	this.order = ((Integer)arr[7]).intValue();
        } else {
        	this.order = Operation.infinity;
        }
	}
	
	/**
     * Makes a copy of this operation object. Takes a shortcut and returns
     * a ref to this instance if the op is marked as mutable.
	 * @throws OperationEngineException 
     *
     * @return Operation object
     */
	public Operation copy() throws OperationEngineException {
		HashMap<String, Object> args = new HashMap<String, Object>();
		
	    args.put("siteId", new Integer(this.siteId));
	    args.put("seqId", new Integer(this.seqId));
	    args.put("contextVector", this.contextVector.copy());
	    args.put("key", this.key);
	    args.put("value", this.value);
	    args.put("position", new Integer(this.position));
	    args.put("order", new Integer(this.order));
	    args.put("local", new Boolean(this.local));
	    args.put("xCache", this.xCache);
	   
	    Operation op;
	    try {
	    	op = Operation.createOperationFromType(this.type, args);
	    }
	    catch(OperationEngineException e) {
	    	e.printStackTrace();
	    	op = null;
	    }
	    
	    return op;
	}
	
	/**
     * Gets a version of the given operation previously transformed into the
     * given context if available.
     *
     * @param cv Context of the transformed op to seek
	 * @throws OperationEngineException 
     * @return Copy of the transformed operation from the 
     * cache or null if not found in the cache
     */
	public Operation getFromCache(ContextVector cv) throws OperationEngineException {
		// check if the cv is a key in the xCache
        Vector<Operation> cache = this.xCache;
        int l = cache.size();
        Operation xop;
           
        for(int i=0; i<l; i++) {
            xop = cache.elementAt(i);
            if(xop.contextVector.equals(cv)) {
                return xop.copy();
            }
        }
        
        return null;
	}
	
	/**
     * Caches a transformed copy of this original operation for faster future
     * transformations.
     *
     * @param siteCount Integer count of active sites, including the local one
	 * @throws OperationEngineException 
     */
	public void addToCache(int siteCount) throws OperationEngineException {
		// pull some refs local
        Vector<Operation> cache = this.xCache;
        Operation cop = this.copy();

        // mark copy as immutable
        cop.immutable = true;

        // add a copy of this transformed op to the history
        cache.addElement(cop);

        // check the count of cached ops against number of sites - 1
        int diff = cache.size() - (siteCount-1);
        if(diff > 0) {
            // if overflow, remove oldest op(s)
        	Operation[] arr = new Operation[cache.size()];
			arr = cache.toArray(arr);
        	Operation[] newArr = Arrays.copyOf(arr, diff);
        	
        	cache.removeAllElements();
        	for(int i=0; i<newArr.length; i++) {
        		cache.addElement(newArr[i]);
        	}        	
        }
	}
	
	/**
     * Computes an ordered comparison of this op and another based on their
     * context vectors. Used for sorting operations by their contexts.
     *
     * @param op Other operation
     * @return -1 if this op is ordered before the other, 0 if they
     * are in the same context, and 1 if this op is ordered after the other
     */
	public int compareByContext(Operation op) {
		int rv = this.contextVector.compare(op.contextVector);
        if(rv == 0) {
            if(this.siteId < op.siteId) {
                return -1;
            } else if(this.siteId > op.siteId) {
                return 1;
            } else {
                return 0;
            }
        }
        return rv;
	}
	
	/**
     * Computes an ordered comparison of this op and another based on their
     * position in the total op order.
     *
     * @param op Other operation
     * @return -1 if this op is ordered before the other, 0 if they
     * are in the same context, and 1 if this op is ordered after the other
     */
    public int compareByOrder(Operation op) {
        if(this.order == op.order) {
            // both unknown total order so next check if both ops are from
            // the same site or if one is from the local site and the other
            // remote
            if(this.local == op.local) {
                // compare sequence ids for local-local or remote-remote order
                return (this.seqId < op.seqId) ? -1 : 1;
            } else if(this.local && !op.local) {
                // this local op must appear after the remote one in the total
                // order as the remote one was included in the late joining 
                // state sent by the remote site to this one meaning it was
                // sent before this site finished joining
                return 1;
            } else if(!this.local && op.local) {
                // same as above, but this op is the remote one now
                return -1;
            }
        } else if(this.order < op.order) {
            return -1;
        } else if(this.order > op.order) {
            return 1;
        }
        
        return -1;
    }
    
    /**
     * Transforms this operation to include the effects of the operation
     * provided as a parameter IT(this, op). Upgrade the context of this
     * op to reflect the inclusion of the other.
     * @throws OperationEngineException 
     *
     * @return This operation, transformed in-place, or null
     * if its effects are nullified by the transform
     * @throws {Error} If this op to be transformed is immutable or if the
     * this operation subclass does not implement the transform method needed
     * to handle the passed op
     */
    public Operation transformWith(Operation op) throws OperationEngineException {
    	if(this.immutable) {
            throw new OperationEngineException("attempt to transform immutable op");
        }
    	
    	Operation rv = null;
    	if(op.type.equals("delete")) {
    		rv = this.transformWithDelete(op);
    	}
    	else if(op.type.equals("insert")) {
    		rv = this.transformWithInsert(op);
    	}
    	else if(op.type.equals("update")) {
    		rv = this.transformWithUpdate(op);
    	}
    	
    	if(rv != null) {
    		this.upgradeContextTo(op);
    	}
    
        return rv;
	}
    
    /**
     * Upgrades the context of this operation to reflect the inclusion of a
     * single other operation from some site.
     *
     * @param op The operation to include in the context of this op
     * @throws OperationEngineException 
     * @throws {Error} If this op to be upgraded is immutable
     */
    public void upgradeContextTo(Operation op) throws OperationEngineException {
    	if(this.immutable) {
            throw new OperationEngineException("attempt to upgrade context of immutable op");
        }
    	
        this.contextVector.setSeqForSite(op.siteId, op.seqId);
	}
	
	public int getSiteId() {
		return this.siteId;
	}

	public int getSeqId() {
		return this.seqId;
	}

	public String getValue() {
		return this.value;
	}
	
	public int getPosition() {
		return this.position;
	}
	
	public ContextVector getContextVector() {
		return this.contextVector;
	}

	public void setImmutable(boolean immutable) {
		this.immutable = immutable;
	}
}
