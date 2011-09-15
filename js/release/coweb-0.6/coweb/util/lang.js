//
// General JS utils.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
//
/*jslint white:false, bitwise:true, eqeqeq:true, immed:true, nomen:false, 
  onevar:false, plusplus:false, undef:true, browser:true, devel:true, 
  forin:false, sub:false*/
/*global define*/
define(function() {
    return {
        /**
         * Make an independent clone of a simple object.
         *
         * @todo review for performance
         * 
         * @param {Object} obj Object with simple properties
         * @returns {Object} Clone of the object
         */
        clone : function(obj) {
            return JSON.parse(JSON.stringify(obj));
        }
    };
});