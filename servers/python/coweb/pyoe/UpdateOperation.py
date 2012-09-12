"""
Represents an update operation that replaces the value of one property
with another.

Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
"""

from Operation import Operation
from factory import factory

class UpdateOperation(Operation):

    """
    @constructor
    """
    def __init__(self, args):
        super(Operation, self).__init__(args)
        self.type = "update"

    """
    Gets the method name to use to transform another operation against this
    update operation.
    
    @return {String} Method name
    """
    def transformMethod(self):
        return "transformWithUpdate"

    """
    Transforms this update to include the effect of an update.
    
    @param {UpdateOperation} op Update to include in this op
    @returns {UpdateOperation} This instance
    """
    def transformWithUpdate(self, op):
        if (not (op.position == self.position) or not (op.key == self.key)):
            return self

        if (self.siteId > op.siteId):
            self.value = op.value
        elif ((self.siteId == op.siteId) and (self.seqId < op.seqId)):
            self.value = op.value
        return self

    """
    Transforms this update to include the effect of an insert.
    
    @param {InsertOperation} op Insert to include in this op
    @returns {UpdateOperation} This instance
    """
    def transformWithInsert(self, op):
        if (not self.key == op.key):
            return self
        if (self.position >= op.position):
            self.position += 1
        return self

    """
    Transforms this update to include the effect of a delete.
    
    @param {DeleteOperation} op Delete to include in this op
    @returns {UpdateOperation} This instance
    """
    def transformWithDelete(self, op):
        if (not self.key == op.key):
            return self
        if (self.position > op.position):
            self.position -= 1;
        elif (self.position == op.position):
            return None
        return self

factory.registerOperationForType("update", UpdateOperation)

