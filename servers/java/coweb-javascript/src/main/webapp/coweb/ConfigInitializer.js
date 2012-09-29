//
// config initializer.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
/*jslint white:false, bitwise:true, eqeqeq:true, immed:true, nomen:false, 
  onevar:false, plusplus:false, undef:true, browser:true, devel:true, 
  forin:false, sub:false*/
/*global define cowebConfig*/

if(typeof cowebConfig === 'undefined') {
    cowebConfig = {};
}

// mix defaults into coweb config where left undefined
cowebConfig = {
    sessionImpl : cowebConfig.sessionImpl || undefined,
    listenerImpl : cowebConfig.listenerImpl || undefined,
    collabImpl : cowebConfig.collabImpl || undefined,
    debug : cowebConfig.debug || false,
    baseUrl : cowebConfig.baseUrl || '',
    adminUrl : cowebConfig.adminUrl || '/admin',
    loginUrl : cowebConfig.loginUrl || '/login',
    logoutUrl : cowebConfig.logoutUrl || '/logout',
    cacheState : cowebConfig.cacheState || false,
    useWebSockets : cowebConfig.useWebSockets || false
};

(function () {
	// build up a list of dependencies dynamically
	var deps = [];
	// add require to be used to load configured implementation modules
	deps.push("require");
	if (cowebConfig.sessionImpl) {
		deps.push(cowebConfig.sessionImpl);
	}
	if (cowebConfig.listenerImpl) {
		deps.push(cowebConfig.listenerImpl);
	}
	if (cowebConfig.collabImpl) {
		deps.push(cowebConfig.collabImpl);
	}
	
	define(deps, function(req) {
		var sessionImpl = cowebConfig.sessionImpl ? req(cowebConfig.sessionImpl) : undefined;
		var listenerImpl = cowebConfig.listenerImpl ? req(cowebConfig.listenerImpl) : undefined;
		var collabImpl = cowebConfig.collabImpl ? req(cowebConfig.collabImpl) : undefined;
		return {sessionImpl: sessionImpl, listenerImpl: listenerImpl, collabImpl: collabImpl};
	});

}());
