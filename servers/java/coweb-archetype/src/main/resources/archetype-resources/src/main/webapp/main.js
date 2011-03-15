//
// Cooperative web application template.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
//

// assumes admin servlet deployed with the application 
var cowebConfig = {
    adminUrl : './admin'
};

require({moduleUrl : 'lib'}, ['coweb/main'], function(coweb) {
    // do application setup here
    
    require.ready(function() {
        // on page load, prepare, join, and update in a session
        var sess = coweb.initSession();
        sess.prepare();
    });
});