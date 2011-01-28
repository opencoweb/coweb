//
// Topic constants for events.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
dojo.provide('coweb.topics');

// prefix for all Hub messages
coweb.PREFIX = 'coweb.';
// service bot topics
coweb.SUB_SERVICE = coweb.PREFIX+'service.sub.';
coweb.GET_SERVICE = coweb.PREFIX+'service.get.';
coweb.UNSUB_SERVICE = coweb.PREFIX+'service.unsub.';
coweb.SET_SERVICE = coweb.PREFIX+'service.response.';
// operation topics
coweb.SYNC = coweb.PREFIX+'sync.';
// full state topics
coweb.GET_STATE = coweb.PREFIX+'state.get';
coweb.SET_STATE = coweb.PREFIX+'state.set.';
coweb.END_STATE = coweb.PREFIX+'state.done';
coweb.ENGINE_STATE = coweb.PREFIX+'engine.state';
coweb.ENGINE_SYNC = coweb.PREFIX+'engine.sync';
// site joining and leaving topics
coweb.SITE_JOIN = coweb.PREFIX+'site.join';
coweb.SITE_LEAVE = coweb.PREFIX+'site.leave';
coweb.READY = coweb.PREFIX+'site.ready';
coweb.END = coweb.PREFIX+'site.end';
// busy state topics
coweb.BUSY = coweb.PREFIX+'busy.change';
