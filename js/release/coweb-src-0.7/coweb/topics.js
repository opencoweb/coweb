//
// Topic constants for events.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*jslint white:false, bitwise:true, eqeqeq:true, immed:true, nomen:false, 
  onevar:false, plusplus:false, undef:true, browser:true, devel:true, 
  forin:false, sub:false*/
/*global define */
define(function() {
    var p = 'coweb.';
    return { 
        // prefix for all Hub messages
        PREFIX : p,
        // service bot topics
        SUB_SERVICE : p+'service.sub.',
        GET_SERVICE : p+'service.get.',
        UNSUB_SERVICE : p+'service.unsub.',
        SET_SERVICE : p+'service.response.',
        // operation topics
        SYNC : p+'sync.',
        // full state topics
        GET_STATE : p+'state.get',
        SET_STATE : p+'state.set.',
        ENGINE_STATE : p+'engine.state',
        ENGINE_SYNC : p+'engine.sync',
        PAUSE_STATE : p+'pause.state',
        // site joining and leaving topics
        SITE_JOIN : p+'site.join',
        SITE_LEAVE : p+'site.leave',
        READY : p+'site.ready',
        END : p+'site.end',
        // busy state topics
        BUSY : p+'busy.change',
        // pausing and resuming topics
        PAUSE_TOPIC : p+'topics.pause',
        RESUME_TOPIC : p+'topics.resume'
    };

});