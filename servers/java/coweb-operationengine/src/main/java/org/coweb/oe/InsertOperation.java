package org.coweb.oe;

import java.util.Map;

public class InsertOperation extends Operation {
	
	protected InsertOperation(Map<String, Object> args) throws OperationEngineException {
		super(args);
		this.type = "insert";
	}
	
	/**
     * Transforms this insert to include the effect of an insert. Assumes 
     * the control algorithm breaks the CP2 pre-req to ensure convergence.
     *
     * @param {InsertOperation} op Insert to include in this op
     * @returns {InsertOperation} This instance
     */
	public Operation transform(Operation op) {
		if(!this.key.equals(op.key)) {
            return this;
        }

        if(this.position > op.position || 
            (this.position == op.position && this.siteId <= op.siteId)) {
            ++this.position;
        }
        return this;
	}
}
