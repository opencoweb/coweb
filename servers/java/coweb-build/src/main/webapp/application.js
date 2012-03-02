//
// Cooperative app.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
//
define(
    //App-specific dependencies
    [
        'dojo',
        'coweb/main',
        'dojo/parser',
        'dojo/_base/connect',
        'dijit/layout/BorderContainer',
        'dijit/layout/ContentPane'
    ],
    function(dojo, coweb, parser, connector) {
        // parse declarative widgets
        parser.parse(dojo.body());

        // get a session instance
        var sess = coweb.initSession();
        
        // connect to the onStatusChange event and log status changes
        connector.connect(sess, "onStatusChange", function(status) {
            console.debug(status);
        });
        
        // do the prep
        sess.prepare();
    }
);