//
// Busy dialog default locale labels.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
//
{
    title : "Busy",
    cancel_button : "Cancel",
    back_button : "Back",
    refresh_button : "Refresh",
    debug_button : "Debug",
    preparing : {
        status: "Preparing the session",
        hint: "The server is preparing your requested session.",
        icon : "busy",
        actions : "busy"
    },
    joining : {
        status: "Joining the session",
        hint: "You are about to enter the requested session.",
        icon : "busy",
        actions : "busy"
    },
    updating : {
        status: "Updating application state",
        hint: "You are receiving the latest application state from the session.",
        icon : "busy",
        actions : "busy"
    },
    aborting : {
        status : "Cancelled session join",
        hint : "You aborted the session join.",
        icon : "fail",
        actions : "fail"
    },
    ready : {
        status : "Session ready",
        hint : "You finished joining the session.",
        icon : "busy",
        actions : "fail"
    },
    "stream-error" : {
        status : "Stream error",
        hint : "The application and/or server experienced an error and your connection was lost. Click <em>Refresh</em> to try joining again.",
        icon : "fail",
        actions : "fail"
    },
    "server-unavailable" : {
        status : "Server unreachable",
        hint : "You lost connectivity with the server or the server shut down. Click <em>Refresh</em> to try joining again.",
        icon : "fail",
        actions : "fail"
    },
    "clean-disconnect" : {
        status : "Disconnected",
        hint : "You were disconnected from the session upon request.",
        icon : "fail",
        actions : "fail"
    },
    "session-unavailable" : {
        status : "Session unavailable",
        hint : "The session ended while you were joining. Click <em>Refresh</em> to start it again.",
        icon : "fail",
        actions : "fail"
    },
    "bad-application-state" : {
        status: "Application error",
        hint: "The application failed to configure itself because of an unexpected error.",
        icon : "fail",
        actions : "fail"
    }
}