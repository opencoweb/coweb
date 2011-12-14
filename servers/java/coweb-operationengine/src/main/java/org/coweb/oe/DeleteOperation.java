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
     * @param {DeleteOperation} op Delete to include in this op
     * @returns {DeleteOperation|null} This instance or null if this op has no
     * further effect on other operations
     */
	public Operation transform(Operation op) {
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
}
