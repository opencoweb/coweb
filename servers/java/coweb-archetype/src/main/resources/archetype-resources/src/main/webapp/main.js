//
// Cooperative web application template.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
//

// assumes admin servlet deployed with the application 
var cowebConfig = {
    adminUrl : './admin'
};

require({
    // assumes the coweb module is under coweb-lib
    paths : {
        coweb : 'coweb-lib/coweb',
        org : 'coweb-lib/org'
    }
}, [
    'coweb/main'
], function(coweb) {
    
    // do application setup here
    
    require.ready(function() {
        // on page load, prepare, join, and update in a session
        var sess = coweb.initSession();
        sess.prepare();
    });
});