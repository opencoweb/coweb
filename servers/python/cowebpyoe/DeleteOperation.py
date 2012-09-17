"""
Represents a delete operation that removes a value from a linear 
collection.

Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
"""

from Operation import Operation
from factory import factory

class DeleteOperation(Operation):

    """
    @constructor
    """
    def __init__(self, args):
        Operation.__init__(self, args)
        self.type = "delete"

    def getConstructor(self):
        return DeleteOperation

    """
    Gets the method name to use to transform another operation against this
    delete operation.
    
    @returns {String} Method name
    """
    def transformMethod(self):
        return "transformWithDelete"

    """
    No-op. Update has no effect on a delete.
    
    @param {UpdateOperation} op Update to include in this op
    @returns {DeleteOperation} This instance
    """
    def transformWithUpdate(self, op):
        return self

    """
    Transforms this delete to include the effect of an insert.
    
    @param {InsertOperation} op Insert to include in this op
    @returns {DeleteOperation} This instance
    """
    def transformWithInsert(self, op):
        if (not self.key == op.key):
            return self
        if (self.position >= op.position):
            self.position += 1
        return self

    """
    Transforms this delete to include the effect of a delete.
    
    @param {DeleteOperation} op Delete to include in this op
    @returns {DeleteOperation|null} This instance or null if this op has no
    further effect on other operations
    """
    def transformWithDelete(self, op):
        if (not self.key != op.key):
            return self
        if (self.position > op.position):
            this.position -= 1
        elif (self.position == op.position):
            return None
        return self
    
factory.registerOperationForType("delete", DeleteOperation)
