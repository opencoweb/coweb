package org.coweb.oe;

import java.util.Map;
import java.util.HashMap;
import java.util.Stack;

public class OperationEngine {

	private int siteId;
	private ContextVector cv = null;
	private ContextVectorTable cvt = null;
	private HistoryBuffer hb = null;
	private int siteCount = 1;

	/**
     * Controls the operational transformation algorithm. Provides a public
     * API for operation processing, garbage collection, and engine 
     * synchronization.
     *
     * @constructor
     * @param {Number} siteId Unique integer site ID for this engine instance
     */
	public OperationEngine(int siteId) throws OperationEngineException {
		this.siteId = siteId;

		HashMap<String, Object>args = new HashMap<String, Object>();
		args.put("count", siteId + 1);
		this.cv = new ContextVector(args);
		this.cvt = new ContextVectorTable(this.cv, siteId);
		this.hb = new HistoryBuffer();
	}

	/**
     * Gets the state of this engine instance to seed a new instance.
     *
     * @return {Object[]} Array or serialized state
     */
	public Object[] getState() {

		int[] frozen = this.cvt.getEquivalents(this.cv,
				this.siteId);

		Object[] ret = { this.cvt.getState(), this.hb.getState(), new Integer(this.siteId),
				frozen };

		return ret;
	}

	/**
     * Sets the state of this engine instance to state received from another
     * instance.
     *
     * @param {Object[]} arr Array in the format returned by getState
     */
	public void setState(Object[] arr) throws OperationEngineException {
		this.cvt.setState((int[][])arr[0]);
		this.hb.setState((Object[])arr[1]);

		this.cv = this.cvt.getContextVector(((Integer)arr[2]).intValue());

		this.cv = this.cv.copy();

		this.cvt.updateWithContextVector(this.siteId, this.cv);

		this.siteCount = this.cv.getSize();

		int[] frozen = (int[]) arr[3];

		for (int i = 0; i < frozen.length; i++) {
			this.freezeSite(frozen[i]);
		}
	}

	/**
	 * Makes a copy of the engine context vector representing the local document
	 * state.
	 * @throws OperationEngineException 
	 * 
	 * @returns {ContextVector} Copy of the context vector for the local site
	 */
	public ContextVector copyContextVector() throws OperationEngineException {
		return this.cv.copy();
	}

	/**
	 * Factory method that creates an operation object initialized with the
	 * given values.
	 * 
	 * @param {Boolean} local True if the operation was originated locally,
	 *        false if not
	 * @param {String} key Operation key
	 * @param {String} value Operation value
	 * @param {String} type Type of operation: update, insert, delete
	 * @param {Number} position Operation integer position
	 * @param {Number} site Integer site ID where a remote op originated.
	 *        Ignored for local operations which adopt the local site ID.
	 * @param {ContextVector} cv Operation context. Ignored for local operations
	 *        which adopt the local site context.
	 * @param {Number} order Place of the operation in the total order. Ignored
	 *        for local operations which are not yet assigned a place in the
	 *        order.
	 * @throws OperationEngineException 
	 * @returns {Operation} Subclass instance matching the given type
	 */
	public Operation createOp(boolean local, String key, String value,
			String type, int position, int site, ContextVector cv, int order) throws OperationEngineException {
		Map<String, Object> args = new HashMap<String, Object>();
		if (local) {
			args.put("key", key);
			args.put("position", new Integer(position));
			args.put("value", value);
			args.put("siteId", new Integer(this.siteId));
			args.put("contextVector", this.copyContextVector());
			args.put("local", true);
		} else {
			// build cv from raw sites array
			HashMap<String, Object> map = new HashMap<String, Object>();
			map.put("sites", cv);
			cv = new ContextVector(map);

			args.put("key", key);
			args.put("position", new Integer(position));
			args.put("value", value);
			args.put("siteId", new Integer(site));
			args.put("contextVector", cv);
			args.put("order", order);
			args.put("local", false);
		}

		return Operation.createOperationFromType(type, args);
	}

	/**
	 * Creates an operation object and pushes it into the operation engine
	 * algorithm. The parameters and return value are the same as those
	 * documented for createOp.
	 * @throws OperationEngineException 
	 */
	public Operation push(boolean local, String key, String value, String type,
			int position, int site, ContextVector cv, int order) throws OperationEngineException {

		Operation op = this.createOp(local, key, value, type, position, site,
				cv, order);
		if (local) {
			return this.pushLocalOp(op);
		} else {
			return this.pushRemoteOp(op);
		}
	}

	/**
	 * Procceses a local operation and adds it to the history buffer.
	 * 
	 * @param {Operation} Local operation
	 * @returns {Operation} Reference to the pass parameter
	 */
	public Operation pushLocalOp(Operation op) {
		// update local context vector
		this.cv.setSeqForSite(op.getSiteId(), op.getSeqId());
		// add to history buffer
		this.hb.addLocal(op);
		return op;
	}

	/**
	 * Procceses a remote operation, transforming it if required, and adds the
	 * original to the history buffer.
	 * 
	 * @param {Operation} Remote operation
	 * @throws OperationEngineException 
	 * @returns {Operation|null} New, transformed operation object or null if
	 *          the effect of the passed operation is nothing and should not be
	 *          applied to the shared state
	 */
	public Operation pushRemoteOp(Operation op) throws OperationEngineException {
		Operation top = null;

		if (this.hasProcessedOp(op)) {
			// let the history buffer track the total order for the op
			this.hb.addRemote(op);
			// engine has already processed this op so ignore it
			return null;
		} else if (this.cv.equals(op.getContextVector())) {
			// no transform needed
			// make a copy so return value is independent of input
			top = op.copy();
		} else {
			// transform needed to upgrade context
			ContextDifference cd = this.cv.subtract(op.getContextVector());
			// make the original op immutable
			op.setImmutable(true);
			// top is a transformed copy of the original
			top = this._transform(op, cd);
		}

		// update local context vector with the original op
		this.cv.setSeqForSite(op.getSiteId(), op.getSeqId());
		// store original op
		this.hb.addRemote(op);
		// update context vector table with original op
		this.cvt.updateWithOperation(op);

		// return the transformed op
		return top;
	}

	/**
	 * Processes an engine synchronization event.
	 * 
	 * @param {Number} site Integer site ID of where the sync originated
	 * @param {ContextVector} cv Context vector sent by the engine at that site
	 * @throws OperationEngineException 
	 */
	public void pushSync(int site, ContextVector cv) throws OperationEngineException {
		// update the context vector table
		this.cvt.updateWithContextVector(site, cv);
	}

	/**
	 * Processes an engine synchronization event.
	 * 
	 * @param {Number} site Integer site ID of where the sync originated
	 * @param {Number[]} Array form of the context vector sent by the site
	 * @throws OperationEngineException 
	 */
	public void pushSyncWithSites(int site, int[] sites) throws OperationEngineException {
		// build a context vector from raw site data
		HashMap<String, Object> args = new HashMap<String, Object>();
		args.put("sites",sites);
		ContextVector cv = new ContextVector(args);
		this.pushSync(site, cv);
	}

	/**
	 * Runs the garbage collection algorithm over the history buffer.
	 * @throws OperationEngineException 
	 * 
	 * @returns {ContextVector|null} Compiuted minimum context vector of the
	 *          earliest operation garbage collected or null if garbage
	 *          collection did not run
	 */
	public ContextVector purge() throws OperationEngineException {
		if (this.getBufferSize() == 0) {
			// exit quickly if there is nothing to purge
			return null;
		}
		// get minimum context vector
		ContextVector mcv = this.cvt.getMinimumContextVector();

		if (mcv == null) {
			// exit quickly if there is no mcv
			return null;
		}

		Operation min_op = null;
		ContextDifference cd = this.cv.oldestDifference(mcv);
		Stack<Operation> ops = this.hb.getOpsForDifference(cd);
		while (ops.size() > 0) {
			// get an op from the list we have yet to process
			Operation curr = ops.pop();
			// if we haven't picked a minimum op yet OR
			// the current op is before the minimum op in context
			if (min_op == null || curr.compareByContext(min_op) == -1) {
				// compute the oldest difference between the document state
				// and the current op
				cd = this.cv.oldestDifference(curr.getContextVector());
				// add the operations in this difference to the list to process
				ops.addAll(this.hb.getOpsForDifference(cd));
				// make the current op the new minimum
				min_op = curr;
			}
		}

		// get history buffer contents sorted by context dependencies
		ops = this.hb.getContextSortedOperations();
		// remove keys until we hit the min
		for (int i = 0; i < ops.size(); i++) {
			Operation op = ops.elementAt(i);
			// if there is no minimum op OR
			// if this op is not the minimium
			if (min_op == null
					|| (min_op.getSiteId() != op.getSiteId() || min_op
							.getSeqId() != op.getSeqId())) {
				// remove operation from history buffer
				this.hb.remove(op);
			} else {
				// don't remove any more ops with context greater than or
				// equal to the minimum
				break;
			}
		}
		return mcv;
	}

	/**
	 * Gets the size of the history buffer in terms of stored operations.
	 * 
	 * @returns {Number} Integer size
	 */
	public int getBufferSize() {
		return this.hb.getCount();
	}

	/**
	 * Gets if the engine has already processed the give operation based on its
	 * context vector and the context vector of this engine instance.
	 * 
	 * @param {Operation} op Operation to check
	 * @returns {Boolean} True if the engine already processed this operation,
	 *          false if not
	 */
	public boolean hasProcessedOp(Operation op) {
		int seqId = this.cv.getSeqForSite(op.getSiteId());
		// console.log('op processed? %s: this.cv=%s, seqId=%d, op.siteId=%d,
		// op.cv=%s, op.seqId=%d',
		// (seqId >= op.seqId), this.cv.toString(), seqId, op.siteId,
		// op.contextVector.toString(), op.seqId);
		return (seqId >= op.getSeqId());
	}

	/**
	 * Freezes a slot in the context vector table by inserting a reference to
	 * context vector of this engine. Should be invoked when a remote site stops
	 * participating.
	 * 
	 * @param {Number} site Integer ID of the site to freeze
	 * @throws OperationEngineException 
	 */
	public void freezeSite(int site) throws OperationEngineException {
		// ignore if already frozen
		if (this.cvt.getContextVector(site) != this.cv) {
			// insert a ref to this site's cv into the cvt for the given site
			this.cvt.updateWithContextVector(site, this.cv);
			// one less site participating now
			this.siteCount--;
		}
	}

	/**
	 * Thaws a slot in the context vector table by inserting a zeroed context
	 * vector into the context vector table. Should be invoked before processing
	 * the first operation from a new remote site.
	 * 
	 * @param {Number} site Integer ID of the site to thaw
	 * @throws OperationEngineException 
	 */
	public void thawSite(int site) throws OperationEngineException {
		// don't ever thaw the slot for our own site
		if (site == this.siteId) {
			return;
		}
		// get the minimum context vector
		ContextVector cv = this.cvt.getMinimumContextVector();
		// grow it to include the site if needed
		cv.growTo(site);
		// use it as the initial context of the site
		this.cvt.updateWithContextVector(site, cv);
		// one more site participating now
		this.siteCount++;
	}

	/**
	 * Gets the number of sites known to be participating, including this site.
	 * 
	 * @returns {Number} Integer count
	 */
	public int getSiteCount() {
		return this.siteCount;
	};

	/**
	 * Executes a recursive step in the operation transformation control
	 * algorithm. This method assumes it will NOT be called if no transformation
	 * is needed in order to reduce the number of operation copies needed.
	 * 
	 * @param {Operation} op Operation to transform
	 * @param {ContextDifference} cd Context vector difference between the given
	 *        op and the document state at the time of this recursive call
	 * @throws OperationEngineException 
	 * @returns {Operation|null} A new operation, including the effects of all
	 *          of the operations in the context difference or null if the
	 *          operation can have no further effect on the document state
	 */
	private Operation _transform(Operation op, ContextDifference cd) throws OperationEngineException {
		// get all ops for context different from history buffer sorted by
		// context dependencies
		Stack<Operation> ops = this.hb.getOpsForDifference(cd);
		Operation xop = null;
		ContextDifference xcd = null;
		Operation cxop = null;
		Operation cop = null;

		// xcd, xop, cxop, cop, i, l;
		// copy the incoming operation to avoid disturbing the history buffer
		// when the op comes from our history buffer during a recursive step
		op = op.copy();
		// iterate over all operations in the difference

		for (int i = 0; i < ops.size(); i++) {
			// xop is the previously applied op
			xop = ops.elementAt(i);
			if (!op.getContextVector().equals(xop.getContextVector())) {
				// see if we've cached a transform of this op in the desired
				// context to avoid recursion
				cxop = xop.getFromCache(op.getContextVector());
				// cxop = null;
				if (cxop != null) {
					xop = cxop;
				} else {
					// transform needed to upgrade context of xop to op
					xcd = op.getContextVector()
							.subtract(xop.getContextVector());
					if (xcd.sites == null || xcd.sites.size() == 0) {
						throw new OperationEngineException(
								"transform produced empty context diff");
					}
					// we'll get a copy back from the recursion
					cxop = this._transform(xop, xcd);
					if (cxop == null) {
						// xop was invalidated by a previous op during the
						// transform so it has no effect on the current op;
						// upgrade context immediately and continue with
						// the next one
						op.upgradeContextTo(xop);
						// @todo: see null below
						continue;
					}
					// now only deal with the copy
					xop = cxop;
				}
			}
			if (!op.getContextVector().equals(xop.getContextVector())) {
				throw new OperationEngineException("context vectors unequal after upgrade");
			}
			// make a copy of the op as is before transform
			cop = op.copy();
			// transform op to include xop now that contexts match IT(op, xop)
			op = op.transformWith(xop);
			if (op == null) {
				// op target was deleted by another earlier op so return now
				// do not continue because no further transforms have any
				// meaning on this op
				// @todo: i bet we want to remove this shortcut if we're
				// deep in recursion when we find a dead op; instead cache it
				// so we don't come down here again
				return null;
			}
			// cache the transformed op
			op.addToCache(this.siteCount);

			// do a symmetric transform on a copy of xop too while we're here
			xop = xop.copy();
			xop = xop.transformWith(cop);
			if (xop != null) {
				xop.addToCache(this.siteCount);
			}
		}
		// op is always a copy because we never entered this method if no
		// transform was needed
		return op;
	}
}
