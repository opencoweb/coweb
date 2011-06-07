//
// Mock bridge for use with testing.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
//
/*global define equals equal deepEqual module test ok*/
define([
    'mock/targets',
    'coweb/topics'
], function(targets, topics) {
    return {
        postSync: function(topic, value, type, position, context) {
            equal(topic, targets.syncTopic, 'sync topic');
            deepEqual(value, targets.inSyncMsg.value, 'sync value');
            deepEqual(type, targets.inSyncMsg.type, 'sync type');
            deepEqual(position, targets.inSyncMsg.position, 'sync position');
            deepEqual(context, targets.inSyncMsg.context, 'sync context');
            return true;
        },

        postEngineSync: function(context) {
            deepEqual(context, targets.engineSync.context, 'engine sync context');
            return true;
        },

        getInitialRoster: function() {
            return targets.roster;
        },

        postServiceSubscribe: function(serviceName) {
            equal(serviceName, targets.serviceName);
        },

        postServiceUnsubscribe: function(serviceName) {
            equal(serviceName, targets.serviceName);
        },

        postServiceRequest: function(serviceName, params, topic) {
            equal(serviceName, targets.serviceName, 'service request name');
            deepEqual(params, targets.serviceParams, 'service request params');
            equal(topic, targets.reqServiceTopic, 'service request topic');
        },

        postStateResponse: function(topic, state, token) {
            equal(token, targets.stateRecipient, 'posted state token');
            if(topic === topics.ENGINE_STATE) {
                deepEqual(state, targets.engineState, 'engine state');
            } else if(topic === null) {
                equal(state, null, 'end state sentinel');
            } else {
                deepEqual(state, targets.stateMsg[topic], 'posted state');
            }
        }
    };
});