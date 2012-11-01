"""
Operation engine public API.

@todo: refactor ops to IT funcs on std objects for performance

Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
"""

from .OperationEngineException import OperationEngineException
from .ContextVectorTable import ContextVectorTable
from .ContextVector import ContextVector
from .HistoryBuffer import HistoryBuffer
from .factory import factory
from .InsertOperation import InsertOperation
from .UpdateOperation import UpdateOperation
from .DeleteOperation import DeleteOperation

class OperationEngine:

    """
    Controls the operational transformation algorithm. Provides a public
    API for operation processing, garbage collection, and engine
    synchronization.

    @constructor
    @param {Number} siteId Unique integer site ID for this engine instance
    """
    def __init__(self, siteId):
        self.siteId = siteId
        self.cv = ContextVector({"count" : siteId+1})
        self.cvt = ContextVectorTable(self.cv, siteId)
        self.hb = HistoryBuffer()
        self.siteCount = 1

    VERSION = "0.8.5-SNAPSHOT"

    """
    Gets the state of this engine instance to seed a new instance.

    @return {Object[]} Array or serialized state
    """
    def getState(self):
        """ op engine state can be cloned from cvt, hb, site ID, and frozen slots """
        """ get indices of frozen cvt slots """
        frozen = self.cvt.getEquivalents(self.cv, self.siteId)
        return (self.cvt.getState(), self.hb.getState(), self.siteId, frozen)

    """
    Sets the state of this engine instance to state received from another
    instance.

    @param {Object[]} arr Array in the format returned by getState
    """
    def setState(self, arr):
        """ configure the history buffer and context vector table """
        self.cvt.setState(arr[0])
        self.hb.setState(arr[1])
        """ pull out the context vector for the sending site """
        self.cv = self.cvt.getContextVector(arr[2])
        """ copy it """
        self.cv = self.cv.copy()
        """ freeze out own site slot """
        self.cvt.updateWithContextVector(self.siteId, self.cv)
        """ set the initial count of active sites; freeze below will adjust """
        self.siteCount = self.cv.getSize()
        """ freeze all sites that must be frozen """
        frozen = arr[3]
        l = len(frozen)
        for i in range(l):
            self.freezeSite(frozen[i])

    """
    Makes a copy of the engine context vector representing the local
    document state.

    @returns {ContextVector} Copy of the context vector for the local site
    """
    def copyContextVector(self):
        return self.cv.copy()

    """
    Factory method that creates an operation object initialized with the
    given values.

    @param {Boolean} local True if the operation was originated locally,
      false if not
    @param {String} key Operation key
    @param {String} value Operation value
    @param {String} type Type of operation: update, insert, delete
    @param {Number} position Operation integer position
    @param {Number} site Integer site ID where a remote op originated.
      Ignored for local operations which adopt the local site ID.
    @param {ContextVector} cv Operation context. Ignored for local
      operations which adopt the local site context.
    @param {Number} order Place of the operation in the total order. Ignored
      for local operations which are not yet assigned a place in the order.
    @returns {Operation} Subclass instance matching the given type
    """
    def createOp(self, local, key, value, _type, position, site=None, cv=None, order=None):
        args = {}
        if (local):
            args["key"] = key
            args["position"] = position
            args["value"] = value
            args["siteId"] = self.siteId
            args["contextVector"] = self.copyContextVector()
            args["local"] = True
        else:
            """ build cv from raw sites array """
            cv = ContextVector({"sites" : cv})
            args["key"] = key
            args["position"] = position
            args["value"] = value
            args["siteId"] = site
            args["contextVector"] = cv
            args["order"] = order
            args["local"] = False
        return factory.createOperationFromType(_type, args)

    """
    Creates an operation object and pushes it into the operation engine
    algorithm. The parameters and return value are the same as those
    documented for createOp.
    """
    def push(self, local, key, value, _type, position, site, cv, order):
        op = self.createOp(local, key, value, _type, position, site, cv, order)
        if (local):
            return self.pushLocalOp(op)
        else:
            return self.pushRemoteOp(op)

    """
    Procceses a local operation and adds it to the history buffer.

    @param {Operation} Local operation
    @returns {Operation} Reference to the pass parameter
    """
    def pushLocalOp(self, op):
        """ update local context vector """
        self.cv.setSeqForSite(op.siteId, op.seqId)
        """ add to history buffer """
        self.hb.addLocal(op)
        return op

    """
    Procceses a remote operation, transforming it if required, and adds
    the original to the history buffer.

    @param {Operation} Remote operation
    @returns {Operation|null} New, transformed operation object or null if
      the effect of the passed operation is nothing and should not be applied
      to the shared state
    """
    def pushRemoteOp(self, op):
        top = None
        if (self.hasProcessedOp(op)):
            """ let the history buffer track the total order for the op """
            self.hb.addRemote(op)
            """ engine has already processed this op so ignore it """
            return None
        elif (self.cv.equals(op.contextVector)):
            """ no transform needed """
            """ make a copy so return value is independent of input """
            top = op.copy()
        else:
            """ transform needed to upgrade context """
            cd = self.cv.subtract(op.contextVector)
            """ make the original op immutable """
            op.immutable = True
            """ top is a transformed copy of the original """
            top = self._transform(op, cd)

        """ update local context vector with the original op """
        self.cv.setSeqForSite(op.siteId, op.seqId)
        """ store original op """
        self.hb.addRemote(op)
        """ update context vector table with original op """
        self.cvt.updateWithOperation(op)

        """ return the transformed op """
        return top

    """
    Processes an engine synchronization event.

    @param {Number} site Integer site ID of where the sync originated
    @param {ContextVector} cv Context vector sent by the engine at that site
    """
    def pushSync(self, site, cv):
        """ update the context vector table """
        self.cvt.updateWithContextVector(site, cv)

    """
    Processes an engine synchronization event.

    @param {Number} site Integer site ID of where the sync originated
    @param {Number[]} Array form of the context vector sent by the site
    """
    def pushSyncWithSites(self, site, sites):
        """ build a context vector from raw site data """
        cv = ContextVector({"state" : sites})
        self.pushSync(site, cv)

    """
    Runs the garbage collection algorithm over the history buffer.

    @returns {ContextVector|null} Compiuted minimum context vector of the
    earliest operation garbage collected or null if garbage collection
    did not run
    """
    def purge(self):
        if (self.getBufferSize() == 0):
            """ exit quickly if there is nothing to purge """
            return None
        """ get minimum context vector """

        mcv = self.cvt.getMinimumContextVector()
        if mcv is None:
            """ exit quickly if there is no mcv """
            return None

        min_op = None
        cd = self.cv.oldestDifference(mcv)
        ops = self.hb.getOpsForDifference(cd)
        while len(ops):
            """ get an op from the list we have yet to process """
            curr = ops.pop()
            """ if we haven't picked a minimum op yet OR """
            """ the current op is before the minimum op in context """
            if (min_op is None or curr.compareByContext(min_op) == -1):
                """ compute the oldest difference between the document state """
                """ and the current op """
                cd = self.cv.oldestDifference(curr.contextVector)
                """ add the operations in this difference to the list to process """
                ops = ops.concat(self.hb.getOpsForDifference(cd))
                """ make the current op the new minimum """
                min_op = curr

        """ get history buffer contents sorted by context dependencies """
        ops = self.hb.getContextSortedOperations()
        """ remove keys until we hit the min """
        for op in ops:
            """ if there is no minimum op OR if this op is not the minimium """
            if (min_op is None or
                    (min_op.siteId != op.siteId or min_op.seqId != op.seqId)):
                """ remove operation from history buffer """
                self.hb.remove(op)
            else:
                """ don't remove any more ops with context greater than or  """
                """ equal to the minimum """
                break
        return mcv

    """
    Gets the size of the history buffer in terms of stored operations.

    @returns {Number} Integer size
    """
    def getBufferSize(self):
        return self.hb.getCount()

    """
    Gets if the engine has already processed the give operation based on
    its context vector and the context vector of this engine instance.

    @param {Operation} op Operation to check
    @returns {Boolean} True if the engine already processed this operation,
      false if not
    """
    def hasProcessedOp(self, op):
        seqId = self.cv.getSeqForSite(op.siteId)
        return seqId >= op.seqId

    """
    Freezes a slot in the context vector table by inserting a reference
    to context vector of this engine. Should be invoked when a remote site
    stops participating.

    @param {Number} site Integer ID of the site to freeze
    """
    def freezeSite(self, site):
        """ ignore if already frozen """
        if (self.cvt.getContextVector(site) != self.cv):
            """ insert a ref to this site's cv into the cvt for the given site """
            self.cvt.updateWithContextVector(site, self.cv)
            """ one less site participating now """
            self.siteCount -= 1

    """
    Thaws a slot in the context vector table by inserting a zeroed context
    vector into the context vector table. Should be invoked before
    processing the first operation from a new remote site.

    @param {Number} site Integer ID of the site to thaw
    """
    def thawSite(self, site):
        """ don't ever thaw the slot for our own site """
        if (site == self.siteId): return
        """ get the minimum context vector """
        cv = self.cvt.getMinimumContextVector()
        """ grow it to include the site if needed """
        cv.growTo(site)
        """ use it as the initial context of the site """
        self.cvt.updateWithContextVector(site, cv)
        """ one more site participating now """
        self.siteCount += 1


    """
    Gets the number of sites known to be participating, including this site.

    @returns {Number} Integer count
    """
    def getSiteCount(self):
        return self.siteCount

    """
    Executes a recursive step in the operation transformation control
    algorithm. This method assumes it will NOT be called if no
    transformation is needed in order to reduce the number of operation
    copies needed.

    @param {Operation} op Operation to transform
    @param {ContextDifference} cd Context vector difference between the
    given op and the document state at the time of this recursive call
    @returns {Operation|null} A new operation, including the effects of all
    of the operations in the context difference or null if the operation
    can have no further effect on the document state
    """
    def _transform(self, op, cd):
        """ get all ops for context different from history buffer sorted by context dependencies """
        ops = self.hb.getOpsForDifference(cd)
        """ copy the incoming operation to avoid disturbing the history buffer """
        """   when the op comes from our history buffer during a recursive step """
        op = op.copy()
        """ iterate over all operations in the difference """
        l = len(ops)
        for i in range(l):
            """ xop is the previously applied op """
            xop = ops[i]
            if (not op.contextVector.equals(xop.contextVector)):
                """ see if we've cached a transform of this op in the desired """
                """ context to avoid recursion """
                cxop = xop.getFromCache(op.contextVector)
                """ cxop = null; """
                if (cxop):
                    xop = cxop
                else:
                    """ transform needed to upgrade context of xop to op """
                    xcd = op.contextVector.subtract(xop.contextVector)
                    if (len(xcd.sites) <= 0):
                        raise OperationEngineException("transform produced empty context diff")
                    """ we'll get a copy back from the recursion """
                    cxop = self._transform(xop, xcd)
                    if cxop is None:
                        """ xop was invalidated by a previous op during the
                        transform so it has no effect on the current op;
                        upgrade context immediately and continue with
                        the next one """
                        op.upgradeContextTo(xop)
                        """ @todo: see null below """
                        continue
                    """ now only deal with the copy """
                    xop = cxop
            if (not op.contextVector.equals(xop.contextVector)):
                raise OperationEngineException("context vectors unequal after upgrade")
            """ make a copy of the op as is before transform """
            cop = op.copy()
            """ transform op to include xop now that contexts match IT(op, xop) """
            op = op.transformWith(xop)
            if op is None:
                """ op target was deleted by another earlier op so return now
                do not continue because no further transforms have any
                meaning on this op
                @todo: i bet we want to remove this shortcut if we're
                deep in recursion when we find a dead op; instead cache it
                so we don't come down here again """
                return None
            """ cache the transformed op """
            op.addToCache(self.siteCount)

            """ do a symmetric transform on a copy of xop too while we're here """
            xop = xop.copy()
            xop = xop.transformWith(cop)
            if (xop):
                xop.addToCache(self.siteCount)
        """ op is always a copy because we never entered this method if no transform was needed """
        return op

