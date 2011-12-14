package org.coweb.oe;

import java.util.Map;

public class UpdateOperation extends Operation {

	protected UpdateOperation(Map<String, Object> args) throws OperationEngineException {
		super(args);
		this.type = "update";
	}
	
	/**
     * Transforms this update to include the effect of an update.
     *
     * @param {UpdateOperation} op Update to include in this op
     * @returns {UpdateOperation} This instance
     */
	public Operation transform(Operation op) {
		if((op.position != this.position) || (!op.key.equals(this.key))) {
            return this;
        }

        if(this.siteId > op.siteId) {
            this.value = op.value;
        } else if((this.siteId == op.siteId) && (this.seqId < op.seqId)) {
            this.value = op.value;
        }
        return this;
	}
}
