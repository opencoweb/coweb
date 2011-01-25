//
// Service bot test page.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
dojo.require('coweb');

/* Logs info about a response to a bot request. */
function _onBotResponse(serviceName, id, value, error) {
    console.log(serviceName, 'responded to collab.id:', id, 'value:', value, 'error:', error);
}

/* Logs info about a message published to all users by a bot. */
function _onBotPublish(serviceName, id, value, error) {
    console.log(serviceName, 'published to collab.id:', id, 'value:', value, 'error:', error);
} 

/* Builds a function that invokes the echo bot using the given collab API
 * instance. 
 */
function _makeEchoFunc(collab) {
    return function(text) {
        collab.postService('echo', {message : text}, 
            dojo.partial(_onBotResponse, 'echo', collab.id));
    };
}

/* Builds a function that invokes the utctime bot using the given collab API
 * instance. 
 */
function _makeTimeFunc(collab) {
    return function() {
        collab.postService('utctime', {}, 
            dojo.partial(_onBotResponse, 'utctime', collab.id));
    };
}

/* Subscribes the collab instances to the echo and utctime services. */
function _onCollabReady(collab) {
    // listen on both interfaces to echo service
    collab.subscribeService('echo', 
        dojo.partial(_onBotPublish, 'echo', collab.id));
    collab.subscribeService('utctime', 
        dojo.partial(_onBotPublish, 'utctime', collab.id));    
}

dojo.ready(function() {    
    // build a couple collab interfaces
    collab1 = coweb.initCollab({id : 'collab1'});
    collab1.subscribeConferenceReady(dojo.partial(_onCollabReady, collab1));
    collab2 = coweb.initCollab({id : 'collab2'});
    collab2.subscribeConferenceReady(dojo.partial(_onCollabReady, collab2));

    // build funcs for use at the console
    echo1 = _makeEchoFunc(collab1);
    echo2 = _makeEchoFunc(collab2);
    getTime1 = _makeTimeFunc(collab1);
    getTime2 = _makeTimeFunc(collab2);

    // initialize a session
    var sess = coweb.initSession();    
    var prep = {collab: false, autoJoin : true, autoUpdate: true};
    sess.prepareConference(prep);
});