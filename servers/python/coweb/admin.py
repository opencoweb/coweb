'''
Session administrator.

Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
# tornado
import tornado.web
import logging
import urlparse
# std lib
import json
# coweb
import bayeux
import session

log = logging.getLogger('coweb.admin')

class AdminHandler(tornado.web.RequestHandler):
    def prepare(self):
        '''Hold a reference to the app container.'''
        self._container = self.application.get_container()

    def get_current_user(self):
        '''
        Called by the tornado.web.authenticated decorator to get the username 
        from the authentication manager.
        '''
        return self._container.auth.get_current_user(self)

    @tornado.web.authenticated
    def post(self):
        '''Handles a request to prepare a session.'''
        # always respond in JSON format
        self.set_header('Content-Type', 'application/json')
        # get info about the user
        username = self.current_user
        
        # decode params
        args = json.loads(self.request.body)
        try:
            key = args['key']
        except KeyError:
            # no key given, abort
            log.warn('admin rejected user %s prep, missing key', username)
            raise tornado.web.HTTPError(400)
        # get collab flag
        collab = args.get('collab', True)
        cacheState = args.get('cacheState', False)
        try:
            # check if there is a session for this key already            
            sessionId = self.application.get_session_id(key, collab, cacheState)
        except KeyError:
            sessionId = None

        # allow container to dictate session access
        access = self._container.access
        sessionInfo = access.on_admin_request(username, key, collab)

        if sessionId is None:
            # create a new session if not started yet
            # if we made it here, user has permission to do so
            sess = session.create_session(
                collab,
                key=key,
                cacheState=cacheState,
                container=self._container,
                deadAfter=self._container.cowebIdleTimeout,
                exts=[bayeux.BayeuxAuthExt, bayeux.BayeuxAckExt]
            )
            # create a new session
            sess.start_session()
            sessionId = sess.sessionId

        # return session info
        resp = {
            'sessionurl': self.application.get_session_url(sessionId),
            'sessionid' : sessionId,
            'key': key,
            'collab': collab,
            'info': sessionInfo,
            'username' : username
        }
        self.write(resp)