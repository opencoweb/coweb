"""
Factory functions.

Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
"""

"""
Creates a history buffer key from a site ID and sequence ID.

@param {Number} site Integer site ID
@param {Number} seq Integer sequence ID at that site
@returns {String} Key for use in get/set in the history buffer
"""
def _createHistoryKey(site, seq):
    return str(site) + "," + str(seq)

"""
Register an operation class for the given type string.

@param {String} type Operation type
@param {Object} cls Operation subclass
"""
def _registerOperationForType(_type, cls):
    factory._typeMap[_type] = cls
    
"""
Create a new operation given its type and constructor args.
    
@param {String} type Registered operation type 
@param {Object} args Constructor arguments for the instance
@returns {Operation} Operation subclass instance
"""
def _createOperationFromType(_type, args):
    OpClass = factory._typeMap[_type]
    return OpClass(args)

"""
Create a new operation given its array-form serialized state.

@param {String} type Registered operation type 
@param {Object[]} state Serialized state from Operation.getState
@returns {Operation} Operation subclass instance
"""
def _createOperationFromState(state):
    OpClass = factory._typeMap[state[0]]
    return OpClass({state : state})

class _EmptyClass: pass

factory = _EmptyClass()
factory._typeMap = {}
factory.createHistoryKey = _createHistoryKey
factory.registerOperationForType = _registerOperationForType
factory.createOperationFromType = _createOperationFromType
factory.createOperationFromState = _createOperationFromState

