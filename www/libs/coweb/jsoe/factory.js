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
         * @param site Integer site ID
         * @param seq Integer sequence ID at that site
         * @return String key
         */
        createHistoryKey : function(site, seq) {
            return site + ',' + seq;
        },

        /** 
         * Register an operation class for the given type string.
         */
        registerOperationForType : function(type, cls) {
            typeMap[type] = cls;
        },
    
        /**
         * Create a new operation given its type and constructor args.
         */
        createOperationFromType : function(type, args) {
            var OpClass = typeMap[type];
            return new OpClass(args);
        },

        /**
         * Create a new operation given its array-form serialized state.
         */    
        createOperationFromState : function(state) {
            var OpClass = typeMap[state[0]];
            return new OpClass({state : state});
        }
    };
});