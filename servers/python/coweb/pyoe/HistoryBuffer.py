"""
History buffer storing original operations.

Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
"""

import factory
import Operation

"""
Stores information about local and remote operations for future
transformations.

@constructor
"""
class HistoryBuffer:

    def __init__(self):
        self.ops = {}
        self.size = 0

    """
    Serializes the history buffer contents to seed a remote instance.

    @return {Object[]} Serialized operations in the history
    """
    def getState(self):
        """ pack keys and values into linear array to minimize wire size """
        arr = []
        for v in self.ops:
            """ only deal with values, keys can be rebuilt from them """
            arr.append(v.getState())
        return arr

    """
    Unserializes history buffer contents to initialize this instance.

    @param {Object[]} arr Array in the format returned by getState
    """
    def setState(self, arr):
        """ reset internals """
        self.size = 0
        self.ops = {}
        l = len(arr)
        for i in range(l):
            """ restore operations """
            op = factory.createOperationFromState(arr[i])
            self.addLocal(op)

    """
    Retrieves all of the operations represented by the given context
    differences from the history buffer. Sorts them by total order, placing
    any ops with an unknown place in the order (i.e., local ops) at the end
    sorted by their sequence IDs. Throws an exception when a requested
    operation is missing from the history.

    @param {ContextDifference} cd  Context difference object
    @returns {Operation[]} Sorted operations
    """
    def getOpsForDifference(self, cd):
        """ get the ops """
        keys = cd.getHistoryBufferKeys()
        ops = []
        l = len(keys)
        for i in range(l):
            key = keys[i]
            if (key not in self.ops):
                raise Exception("missing op for context diff: i=" i + " key=" + key + " keys=" + str(keys))
            ops.push(self.ops[key])
        """ sort by total order """
        return sorted(ops, lambda x,y: x.compareByOrder(y))
    };

    """
    Adds a local operation to the history.

    @param {Operation} Local operation to add
    """
    def addLocal(self, op):
        key = factory.createHistoryKey(op.siteId, op.seqId)
        self.ops[key] = op
        """ make sure ops in the history never change """
        op.immutable = true
        self.size += 1

    """
    Adds a received operation to the history. If the operation already
    exists in the history, simply updates its order attribute. If not,
    adds it. Throws an exception if the op does not include its place in
    the total order or if the op with the same key already has an assigned
    place in the total order.

    @param {Operation} Received operation to add
    """
    def addRemote(self, op):
        key = factory.createHistoryKey(op.siteId, op.seqId)
        eop = self.ops[key]
        if (order not in op):
            """ remote op must have order set by server """
            raise Exception("remote op missing total order")
        elif (eop):
            if(eop.order !== Infinity) {
                // order should never repeat
                throw new Error(messages.dupop+eop.order +
                    ' new='+op.order);
            }
            // server has responded with known total order for an op this site
            // previously sent; update the local op with the info
            eop.order = op.order;
        } else {
            // add new remote op to history
            this.ops[key] = op;
            op.immutable = true;
            ++this.size;
        }
    };

    """
    Removes and returns an operation in the history.

    @param {Operation} op Operation to locate for removal
    @returns {Operation} Removed operation
    """
    HistoryBuffer.prototype.remove = function(op) {
        var key = factory.createHistoryKey(op.siteId, op.seqId);
        op = this.ops[key];
        delete this.ops[key];
        // no longer in the history, so allow mutation
        op.immutable = false;
        --this.size;
        return op;
    };

    """
    Gets the number of operations in the history.

    @returns {Number} Integer count
    """
    HistoryBuffer.prototype.getCount = function() {
        return this.size;
    };

    """
    Gets all operations in the history buffer sorted by context.

    @returns {Operation[]} Sorted operations
    """
    HistoryBuffer.prototype.getContextSortedOperations = function() {
        var ops = [];
        // put all ops into an array
        for(var key in this.ops) {
            if(this.ops.hasOwnProperty(key)) {
                ops.push(this.ops[key]);
            }
        }
        // sort them by context, sequence, and site
        ops.sort(function(a,b) { return a.compareByContext(b); });
        return ops;
    };

    return HistoryBuffer;
});
