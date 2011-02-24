//
// General JS utils.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
//
/*global define*/
define(function() {
    return {
        // @todo: performance
        clone : function(obj) {
            return JSON.parse(JSON.stringify(obj))
        }
    };
});