//
// RequireJS build script that includes BayeuxSession as the SessionInterface,
// UnamangedHubListener as the ListenerInterface, and UnmanagedHubCollab as
// the CollabInterface.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
//
({
    baseUrl: "../lib/",
    dir: "../release/coweb-latest",
    modules: [
        {
            name: "coweb/main",
            includeRequire: false,
            include : [
                "coweb/session/BayeuxSession",
                "coweb/listener/UnmanagedHubListener",
                "coweb/collab/UnmanagedHubCollab"
            ]
        }
    ]
})