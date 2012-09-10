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
     * @param op Update to include in this op
     * @return This instance
     */
	public Operation transformWithUpdate(Operation op) {
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
	
	/**
     * Transforms this update to include the effect of an insert.
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
	
	/**
     * Transforms this update to include the effect of a delete.
     *
     * @param op Delete to include in this op
     * @return This instance
     */
	public Operation transformWithDelete(Operation op) {
		if (!this.key.equals(op.key)) {
			return this;
		}
		if (this.position > op.position) {
			--this.position;
		} else if (this.position == op.position) {
			return null;
		}
		return this;
	}
}
