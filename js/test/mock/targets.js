//
// Some fixture target data for use with tests.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
//
/*global define*/
define(['coweb/topics'], function(topics) {
    var targets = {
        localSiteId : 5,
        localUsername : 'foo.bar',
        roster : {
            1 : 'john.doe',
            2 : 'jane.smith',
            4 : 'bob.watts'
        },
        syncTopic : topics.SYNC+'name.wid0',
        outSyncMsg : {
            value : 'abc',
            type : 'insert',
            position : 1
        },
        inSyncMsg : {
            value : JSON.stringify('abc'),
            type : 'insert',
            position : 1,
            context : [0,0,0,0,0,0]
        },
        inHubSyncMsg : {
            position : 1,
            type : 'insert',
            value : 'abc',
            site : 1
        },
        serviceName : 'somebot',
        serviceParams : {
            a : 'b',
            c : 'd'
        },
        serviceResponse : {
            e : 'f',
            g : 'h'
        },
        hubServiceResponse: {
            value : {
                e : 'f',
                g : 'h'
            },
            error : false
        },
        hubServiceError : {
            value : 'service error message',
            error : true
        },
        reqServiceTopic : topics.GET_SERVICE+'somebot_0.wid4',
        respServiceTopic : topics.SET_SERVICE+'somebot_0.wid4',
        pubServiceTopic : topics.SET_SERVICE+'somebot',
        stateMsg : {},
        stateRecipient : '123abc',
        engineState : [
            [
                [0,0,0,0,0,0],
                [0,0,0,0,0,0],
                [0,0,0,0,0,0],
                [0,0,0,0,0,0],
                [0,0,0,0,0,0],
                [0,0,0,0,0,0]
            ],
            [],
            5,
            [0]
        ],
        engineSync : {
            value : '',
            type : 'update',
            position : 0,
            context :  [0,0,0,0,0,0]
        },
        pauseState: []
    };
    targets.stateMsg[topics.SET_STATE+'wid1'] = [1,2,3];
    targets.stateMsg[topics.SET_STATE+'wid2'] = [4,5];
    targets.stateMsg[topics.SET_STATE+'wid3'] = {6: 'seven'};

    return targets;
});