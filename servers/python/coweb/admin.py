'''
Session administrator.

Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
# tornado
import tornado.web
import logging
# std lib
import json
import uuid
import hashlib
# coweb
from . import bayeux
from . import session

log = logging.getLogger('coweb.admin')

def generate_collab_key():
    return hashlib.md5(uuid.uuid4().urn.encode('utf-8')).hexdigest()

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
        username = self.current_user.decode("utf-8")
        
        # decode params
        raw = self.request.body.decode("utf-8")
        args = json.loads(raw)
        key = args.get('key', None)
        collab = args.get('collab', None)
        cacheState = args.get('cacheState', False)

        # Generate key if none given.
        if key is None:
            key = generate_collab_key()

        sessionId = self.application.get_session_id(key, collab, cacheState)

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
