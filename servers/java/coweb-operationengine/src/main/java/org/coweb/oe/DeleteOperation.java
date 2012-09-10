package org.coweb.oe;

import java.util.Map;

public class DeleteOperation extends Operation {

	protected DeleteOperation(Map<String, Object> args) throws OperationEngineException {
		super(args);
		this.type = "delete";
	}
	
	
	/**
     * Transforms this delete to include the effect of a delete.
     *
     * @param op Delete to include in this op
     * @return This instance or null if this op has no
     * further effect on other operations
     */
	public Operation transformWithDelete(Operation op) {
		if(!this.key.equals(op.key)) {
            return this;
        }
        if(this.position > op.position) {
            --this.position;
        } else if(this.position == op.position) {
            return null;
        }
        return this;
	}
	
	/**
     * No-op. Update has no effect on a delete.
     *
     * @param op Update to include in this op
     * @return This instance
     */
	public Operation transformWithUpdate(Operation op) {
		return this;
	}
	
	/**
     * Transforms this delete to include the effect of an insert.
     *
     * @param op Insert to include in this op
     * @return This instance
     */
	public Operation transformWithInsert(Operation op) {
		if(!this.key.equals(op.key)) {
            return this;
        }
        if(this.position >= op.position) {
            ++this.position;
        }
        
        return this;
	}
}
