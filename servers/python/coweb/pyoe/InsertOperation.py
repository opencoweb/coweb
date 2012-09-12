"""
Represents an insert operation that adds a value to a linear collection.

Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
"""

from Operation import Operation
from factory import factory

class InsertOperation(Operation):

    """
    @constructor
    """
    def __init__(self, args):
        super(Operation, self).__init__(args)
        self.type = "insert"
        
    """
    Gets the method name to use to transform another operation against this
    insert operation.
    
    @returns {String} Method name
    """
    def transformMethod(self):
        return "transformWithInsert"

    """
    No-op. Update has no effect on an insert.
    
    @param {UpdateOperation} op Update to include in this op
    @returns {InsertOperation} This instance
    """
    def transformWithUpdate(self, op):
        return self

    """
    Transforms this insert to include the effect of an insert. Assumes 
    the control algorithm breaks the CP2 pre-req to ensure convergence.
    
    @param {InsertOperation} op Insert to include in this op
    @returns {InsertOperation} This instance
    """
    def transformWithInsert(self, op):
        if (self.key != op.key):
            return self

        if (self.position > op.position or
                (self.position == op.position and self.siteId <= op.siteId)):
            self.position += 1
        return self

    """
    Transforms this insert to include the effect of a delete.
    
    @param {DeleteOperation} op Delete to include in this op
    @return {InsertOperation} This instance
    """
    def transformWithDelete(self, op):
        if (self.key != op.key):
            return self
        if (self.position > op.position):
            self.position -= 1
        return self
    
factory.registerOperationForType("insert", InsertOperation)
