package org.coweb.oe;

import java.util.Collection;
import java.util.HashMap;
import java.util.Vector;
import java.util.Stack;
import java.util.Arrays;
import java.util.Comparator;

public class HistoryBuffer {
	
	private HashMap<String, Operation> ops = null;
	private int size = 0;

	public HistoryBuffer() {
		this.ops = new HashMap<String, Operation>();
		this.size = 0;
	}
	
	/**
     * Serializes the history buffer contents to seed a remote instance.
     *
     * @return {Object[]} Serialized operations in the history
     */
	public Object[] getState() {
		Vector<Object[]> v = new Vector<Object[]>();
		Operation op = null;
		
		for(String key : this.ops.keySet()) {
			op = this.ops.get(key);
			v.addElement(op.getState());
		}
		
		return v.toArray();
	}
	
	/**
     * Unserializes history buffer contents to initialize this instance.
     *
     * @param {Object[]} arr Array in the format returned by getState
     */
	public void setState(Object[] arr) {
		// reset internals
        this.size = 0;
        this.ops.clear();
        for(int i=0; i < arr.length; i++) {
            // restore operations
            Operation op = null;
            try {
            	op = Operation.createOperationFromState((Object[])arr[i]);
                this.addLocal(op);
            }
            catch(OperationEngineException e) { ; }
        }
	}
	
	/**
     * Retrieves all of the operations represented by the given context
     * differences from the history buffer. Sorts them by total order, placing
     * any ops with an unknown place in the order (i.e., local ops) at the end
     * sorted by their sequence IDs. Throws an exception when a requested 
     * operation is missing from the history.
     *
     * @param {ContextDifference} cd  Context difference object
	 * @throws OperationEngineException 
     * @returns {Operation[]} Sorted operations
     */ 
	public Stack<Operation> getOpsForDifference(ContextDifference cd) throws OperationEngineException {
		// get the ops
        String[] keys = cd.getHistoryBufferKeys();
        Vector<Operation> opsStack = new Vector<Operation>();
        int l = keys.length;
        String key;
        Operation op;
        
        for(int i=0; i < l; i++) {
            key = keys[i];
            op = this.ops.get(key);
            if(op == null) {
                throw new OperationEngineException("missing op for context diff: i=" + i + 
                    " key=" + key + " keys=" + keys.toString());
            }
            opsStack.addElement(op);
        }
        
        // sort by total order
        Operation[] arr = (Operation[])opsStack.toArray();
        Arrays.sort(arr, new Comparator<Operation>() {
        	public int compare(Operation a, Operation b) {
        		return a.compareByOrder(b);
        	}
        });
        
        Stack<Operation> stack = new Stack<Operation>();
        stack.addAll(Arrays.asList(arr));
        
        return stack;
	}
	
	/**
     * Adds a local operation to the history.
     *
     * @param {Operation} Local operation to add
     */
	public void addLocal(Operation op) {
		String key = Operation.createHistoryKey(op.siteId, op.seqId);
        this.ops.put(key, op);
        // make sure ops in the history never change
        op.immutable = true;
        ++this.size;
	}
	
	/**
     * Adds a received operation to the history. If the operation already 
     * exists in the history, simply updates its order attribute. If not, 
     * adds it. Throws an exception if the op does not include its place in 
     * the total order or if the op with the same key already has an assigned
     * place in the total order.
     *
     * @param {Operation} Received operation to add
	 * @throws OperationEngineException 
     */
	public void addRemote(Operation op) throws OperationEngineException {
		String key = Operation.createHistoryKey(op.siteId, op.seqId);
        Operation eop = this.ops.get(key);
        
        if(op.order == Operation.infinity) { 
            // remote op must have order set by server
            throw new OperationEngineException("remote op missing total order");
        } else if(eop != null) {
            if(eop.order != Operation.infinity) {
                // order should never repeat
                throw new OperationEngineException("duplicate op in total order: old="+eop.order +
                    " new="+op.order);
            }
            // server has responded with known total order for an op this site
            // previously sent; update the local op with the info
            eop.order = op.order;
        } else {
            // add new remote op to history
            this.ops.put(key, op);
            op.immutable = true;
            ++this.size;
        }
	}
	
	/**
     * Removes and returns an operation in the history.
     *
     * @param {Operation} op Operation to locate for removal
     * @returns {Operation} Removed operation
     */
	public Operation remove(Operation op) {
		String key = Operation.createHistoryKey(op.siteId, op.seqId);
		
		op = this.ops.remove(key);
		
        // no longer in the history, so allow mutation
		op.immutable = false;
        
        --this.size;
        return op;
	}
	
	/**
     * Gets the number of operations in the history.
     *
     * @returns {Number} Integer count
     */
	public int getCount() {
		return this.size;
	}
	
	
	/**
     * Gets all operations in the history buffer sorted by context.
     *
     * @returns {Operation[]} Sorted operations
     */
	public Stack<Operation> getContextSortedOperations() {
		
		Collection<Operation> collection = this.ops.values();
		Operation[] arr = (Operation[])collection.toArray();
		
		Arrays.sort(arr, new Comparator<Operation>() {
			public int compare(Operation a, Operation b) {
				return a.compareByContext(b);
			}
		});
		
		Stack<Operation> stack = new Stack<Operation>();
		stack.addAll(Arrays.asList(arr));
		
		return stack;
	}
}
