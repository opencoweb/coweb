//
// Factory functions.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*global define*/
define(function() {
    // for registered subclasses of Operation
    var typeMap = {};

    return {
        /**
         * Creates a history buffer key from a site ID and sequence ID.
         *
         * @param {Number} site Integer site ID
         * @param {Number} seq Integer sequence ID at that site
         * @returns {String} Key for use in get/set in the history buffer
         */
        createHistoryKey : function(site, seq) {
            return site + ',' + seq;
        },

        /** 
         * Register an operation class for the given type string.
         *
         * @param {String} type Operation type
         * @param {Object} cls Operation subclass
         */
        registerOperationForType : function(type, cls) {
            typeMap[type] = cls;
        },
    
        /**
         * Create a new operation given its type and constructor args.
         *
         * @param {String} type Registered operation type 
         * @param {Object} args Constructor arguments for the instance
         * @returns {Operation} Operation subclass instance
         */
        createOperationFromType : function(type, args) {
            var OpClass = typeMap[type];
            return new OpClass(args);
        },

        /**
         * Create a new operation given its array-form serialized state.
         *
         * @param {String} type Registered operation type 
         * @param {Object[]} state Serialized state from Operation.getState
         * @returns {Operation} Operation subclass instance
         */    
        createOperationFromState : function(state) {
            var OpClass = typeMap[state[0]];
            return new OpClass({state : state});
        }
    };
});