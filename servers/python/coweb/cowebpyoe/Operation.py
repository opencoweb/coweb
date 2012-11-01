"""
Defines the base class for operations.

@todo: probably shouldn't be a class for performance; a bunch of functions
that act on raw js objects representing ops would cut out the serialize
steps and make copy simpler most likely

Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
"""

from OperationEngineException import OperationEngineException
from ContextVector import ContextVector

class Operation:
    """
    Contains information about a local or remote event for transformation.

    Initializes the operation from serialized state or individual props if
    state is not defined in the args parameter.

    @param {Object[]} args.state Array in format returned by getState 
      bundling the following individual parameter values
    @param {Number} args.siteId Integer site ID where the op originated
    @param {ContextVector} args.contextVector Context in which the op 
      occurred
    @param {String} args.key Name of the property the op affected
    @param {String} args.value Value of the op
    @param {Number} args.position Integer position of the op in a linear
      collection
    @param {Number} args.order Integer sequence number of the op in the 
      total op order across all sites
    @param {Number} args.seqId Integer sequence number of the op at its
      originating site. If undefined, computed from the context vector and
      site ID.
    @param {Boolean} args.immutable True if the op cannot be changed, most
      likely because it is in a history buffer somewhere
      to this instance
    """
    def __init__(self, args = None):
        self.type = \
        self.xCache = \
        self.immutable = \
        self.siteId = \
        self.contextVector = \
        self.key = \
        self.value = \
        self.position = \
        self.order = \
        self.seqId = \
        self.xCache = \
        self.local = None

        if (None == args):
            """ abstract """
            self.type = None
            return
        elif ("state" in args):
            """ restore from state alone """
            self.setState(args["state"])
            """ never local when building from serialized state """
            self.local = False
        else:
            """ use individual properties """
            self.siteId = args["siteId"]
            self.contextVector = args["contextVector"]
            self.key = args["key"]
            self.value = args["value"]
            self.position = args["position"]
            self.order = args["order"] if "order" in args else None
            if ("seqId" in args):
                self.seqId = args["seqId"]
            elif (self.contextVector):
                self.seqId = self.contextVector.getSeqForSite(self.siteId) + 1
            else:
                raise OperationEngineException("missing sequence id for new operation")
            self.xCache = args["xCache"] if "xCache" in args else None
            self.local = args["local"] if "local" in args else False

        """ always mutable to start """
        self.immutable = False
        """ define the xcache if not set elsewhere """
        if (not self.xCache):
            self.xCache = []

    """
    Serializes the operation as an array of values for transmission.
    
    @return {Object[]} Array with the name of the operation type and all
    of its instance variables as primitive JS types
    """
    def getState(self):
        """ use an array to minimize the wire format """
        return [self.type, self.key, self.value, self.position, 
            self.contextVector.sites, self.seqId, self.siteId,
            self.order]

    """
    Unserializes operation data and sets it as the instance data. Throws an
    exception if the state is not from an operation of the same type.
    
    @param {Object[]} arr Array in the format returned by getState
    """
    def setState(self, arr):
        if (not (arr[0] == self.type)):
            raise OperationEngineException("setState invoked with state from wrong op type")
        elif (self.immutable):
            raise OperationEngineException("op is immutable")
        """ name args as required by constructor """
        self.key = arr[1]
        self.value = arr[2]
        self.position = arr[3]
        self.contextVector = ContextVector({"state" : arr[4]})
        self.seqId = arr[5]
        self.siteId = arr[6]
        self.order = arr[7]

    """
    Makes a copy of this operation object. Takes a shortcut and returns
    a ref to this instance if the op is marked as mutable.
    
    @returns {Operation} Operation object
    """
    def copy(self):
        args = {
            "siteId" : self.siteId,
            "seqId" : self.seqId,
            "contextVector" : self.contextVector.copy(),
            "key" : self.key,
            "value" : self.value,
            "position" : self.position,
            "order" : self.order,
            "local" : self.local,
            """ reference existing xCache """
            "xCache" : self.xCache
        }
        """ respect subclasses """
        return self.getConstructor()(args)

    """
    Gets a version of the given operation previously transformed into the
    given context if available.
    
    @param {ContextVector} cv Context of the transformed op to seek
    @returns {Operation|null} Copy of the transformed operation from the 
    cache or null if not found in the cache
    """
    def getFromCache(self, cv):
        """ check if the cv is a key in the xCache """
        cache = self.xCache
        l = len(cache)
        for i in range(l):
            xop = cache[i]
            if (xop.contextVector.equals(cv)):
                return xop.copy()
        return None

    """
    Caches a transformed copy of this original operation for faster future
    transformations.
    
    @param {Number} Integer count of active sites, including the local one
    """
    def addToCache(self, siteCount):
        """ pull some refs local """
        cache = self.xCache
        cop = self.copy()

        """ mark copy as immutable """
        cop.immutable = True

        """ add a copy of this transformed op to the history """
        cache.append(cop)

        """ check the count of cached ops against number of sites - 1 """
        diff = len(cache) - (siteCount-1)
        if (diff > 0):
            """ if overflow, remove oldest op(s) """
            cache = cache[diff:]

    """
    Computes an ordered comparison of this op and another based on their
    context vectors. Used for sorting operations by their contexts.
    
    @param {Operation} op Other operation
    @returns {Number} -1 if this op is ordered before the other, 0 if they
    are in the same context, and 1 if this op is ordered after the other
    """
    def compareByContext(self, op):
        rv = self.contextVector.compare(op.contextVector)
        if (rv == 0):
            if (self.siteId < op.siteId):
                return -1
            elif (self.siteId > op.siteId):
                return 1
            else:
                return 0
        return rv
    
    """
    Computes an ordered comparison of this op and another based on their
    position in the total op order.
    
    @param {Operation} op Other operation
    @returns {Number} -1 if this op is ordered before the other, 0 if they
    are in the same context, and 1 if this op is ordered after the other
    """
    def compareByOrder(self, op):
        if (self.order == op.order):
            """ both unknown total order so next check if both ops are from
                the same site or if one is from the local site and the other
                remote """
            if (self.local == op.local):
                """ compare sequence ids for local-local or remote-remote order """
                return -1 if (self.seqId < op.seqId) else 1
            elif (self.local and not op.local):
                """ this local op must appear after the remote one in the total
                    order as the remote one was included in the late joining 
                    state sent by the remote site to this one meaning it was
                    sent before this site finished joining """
                return 1
            elif (not self.local and op.local):
                """ same as above, but this op is the remote one now """
                return -1
        elif (self.order < op.order):
            return -1
        elif (self.order > op.order):
            return 1
    
    """
    Transforms this operation to include the effects of the operation
    provided as a parameter IT(this, op). Upgrade the context of this
    op to reflect the inclusion of the other.
    
    @returns {Operation|null} This operation, transformed in-place, or null
    if its effects are nullified by the transform
    @throws {Error} If this op to be transformed is immutable or if the
    this operation subclass does not implement the transform method needed
    to handle the passed op
    """
    def transformWith(self, op):
        if (self.immutable):
            raise OperationEngineException("attempt to transform immutable op")
        meth = op.transformMethod()
        func = self.getMethod(meth)
        if (not func):
            raise OperationEngineException("operation cannot handle transform with type: " + op.type)
        """ do the transform """
        rv = func(op)
        """ check if op effects nullified """
        if (rv):
            """ upgrade the context of this op to include the other """
            self.upgradeContextTo(op)
        return rv
    
    """
    Upgrades the context of this operation to reflect the inclusion of a
    single other operation from some site.
    
    @param {Operation} The operation to include in the context of this op
    @throws {Error} If this op to be upgraded is immutable
    """
    def upgradeContextTo(self, op):
        if (self.immutable):
            raise OperationEngineException("attempt to upgrade context of immutable op")
        self.contextVector.setSeqForSite(op.siteId, op.seqId)

    """
    Gets the name of the method to use to transform this operation with
    another based on the type of this operation defined by a subclass.
    
    Abstract implementation always throws an exception if not overriden.
    """ 
    def getTransformMethod(self):
        raise OperationEngineException("transformMethod not implemented")

    def getMethod(self, meth):
        if ("transformWithInsert" == meth):
            return self.transformWithInsert
        elif ("transformWithUpdate" == meth):
            return self.transformWithUpdate
        elif ("transformWithDelete" == meth):
            return self.transformWithDelete
        raise OperationEngineException("Invalid method " + meth)

    def getConstructor(self):
        raise OperationEngineException("getConstructor not implemented in base class Operation")

