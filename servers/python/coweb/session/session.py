'''
Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
# tornado
import tornado.httpserver
import tornado.ioloop
import tornado.web
from tornado.escape import json_encode, json_decode
# std lib
import ConfigParser
import os
import uuid
import logging
import uuid
# coweb
from .. import bayeux
from .. import service

log = logging.getLogger('coweb.session')

class Session(bayeux.BayeuxManager):
    '''
    Manages a session instance that supports services but no user cooperative 
    events.
    '''
    def __init__(self, container, key, cacheState, *args, **kwargs):
        super(Session, self).__init__(*args, **kwargs)
        self.collab = False
        # produce unique session ID
        self.sessionId = uuid.uuid4().hex
        self.key = key
        self.cacheState = cacheState

        self._connectionClass = SessionConnection
        self._container = container
        self._application = container.webApp
        # bridge between users and service bots
        self._services = service.ServiceSessionBridge(container, self)
        
    def build_connection(self, handler):
        '''Override to build proper connection.'''
        return self._connectionClass(handler, self)

    def start_session(self):
        '''Register session and service handlers.'''
        self._application.add_session_handler(self, SessionHandler)
        # delegate to service manager
        self._services.start_services()
        log.info('started session %s', self.sessionId)
        
    def end_session(self):
        '''Unregister session and service handlers.'''
        self._application.remove_session_handler(self)
        # delegate to service manager
        self._services.end_services()
        self.destroy()
        log.info('ended session %s', self.sessionId)
        
    def is_user_present(self, username):
        '''Gets if a user is present in the session by username.'''
        for cl in self._clients.values():
            if cl.username == username: return True
        return False

    def get_service_manager(self):
        '''Gets the service manager for this session.'''
        return self._services.manager
        
    def get_session_id(self):
        '''Gets the ID of this session.'''
        return self.sessionId

    def authorize_user(self, username):
        '''Checks user permissions to access this session.'''
        return self._container.access.on_session_request(self, username)
    
    def queue_updatee(self, client):
        '''Sends empty updater immediately to client.'''
        client.add_message({
            'channel':'/service/session/join/siteid',
            'data': 1
        })
        client.add_message({
            'channel':'/service/session/join/state',
            'data': []
        })
        
    def subscribe_to_service(self, client, req, res, public):
        '''Notifies the service manager of a client subscription.'''
        return self._services.on_user_subscribe(client, req, res, public)

    def unsubscribe_from_service(self, client, req, res, public):
        '''Notifies the service manager of a client unsubscription.'''
        return self._services.on_user_unsubscribe(client, req, res, public)
    
    def request_for_service(self, client, req, res):
        '''Notifies the service manager of a client service request.'''
        return self._services.on_user_request(client, req, res)

    def remove_bad_client(self, cl):
        '''Removes a misbehaving client.'''
        self.delete_client(cl.clientId)
        cl.destroy()

    def on_purging_client(self, cid, client):
        '''Overrides to end the session when no clients remain.'''
        # notify services about leaving client
        self._services.on_user_unsubscribe_all(client)
        if len(self._clients) == 0:
            # kill the session, last one leaving
            self.end_session()

class SessionHandler(bayeux.HTTPBayeuxHandler):
    '''Handler for sessions.'''
    def prepare(self):
        '''Overrides to do nothing.'''
        # don't do prepare logic, need session id to get manager
        pass

    def get_current_user(self):
        '''Overrides to get user from auth manager.'''
        container = self.application.get_container()
        return container.auth.get_current_user(self)
    
    def post(self, sessionId):
        '''Fetches manager and builds a connection using session id.'''
        try:
            manager = self.application.get_session_obj(sessionId)
        except KeyError:
            # session going away, ignore
            raise tornado.web.HTTPError(500)
        self.connection = manager.build_connection(self)
        super(SessionHandler, self).post()

class SessionConnection(bayeux.BayeuxConnection):
    '''Connection for uncollaborative sessions.'''
    def on_auth_ext(self, cl, auth):
        '''Overrides to use cookie + db for Bayeux authentication.'''
        username = self._handler.current_user
        if username is None: return False
        # check credentials in the db
        return self._manager.authorize_user(username)
        
    def on_handshake(self, cl, req, res):
        '''Overrides to attach authed username to client.'''
        if res['successful']:
            cl.username = self._handler.current_user

    def on_unknown_client(self, res):
        '''Overrides to prevent reconnects from dead clients.'''
        # tell clients to give up when unknown, not to attempt reconnect with
        # a new handshake
        res['advice'] = {'reconnect' : 'none'}
    
    def on_subscribe(self, cl, req, res):
        '''Overrides to handle join and service bot subscriptions.'''
        sub = req['subscription']
        didSub = True        
        if sub.startswith('/service/bot'):
            # handle private subscribe to bot
            didSub = self._manager.subscribe_to_service(cl, req, res, False)
        elif sub.startswith('/bot'):
            # public subscribe to bot
            didSub = self._manager.subscribe_to_service(cl, req, res, True)
        elif sub == '/service/session/join/*':
            # respond immediately with empty updater
            ext = req['ext']
            coweb = ext['coweb']
            updaterType = coweb['updaterType']
            # log.info('updaterType %s', updaterType )
            cl.updaterType = updaterType
            self._manager.queue_updatee(cl)
            didSub = True
        if didSub:
            # don't run default handling if sub failed
            super(SessionConnection, self).on_subscribe(cl, req, res)
    
    def on_unsubscribe(self, cl, req, res):
        '''Overrides to handle service bot unsubscriptions.'''
        sub = req['subscription']
        didSub = True
        if sub.startswith('/service/bot'):
            # handle private subscribe to bot
            didSub = self._manager.unsubscribe_from_service(cl, req, res, False)
        elif sub.startswith('/bot'):
            # public subscribe to bot
            didSub = self._manager.unsubscribe_from_service(cl, req, res, True)
        if didSub:
            # don't run default handling if sub failed
            super(SessionConnection, self).on_unsubscribe(cl, req, res)

    def on_publish(self, cl, req, res):
        '''Overrides to handle bot requests.'''
        ch = req['channel']
        if ch.startswith('/service/bot'):
            # private bot message
            if not self._manager.request_for_service(cl, req, res):
                return
        elif not self._manager.collab:
            # disallow posting to any other channel by clients
            res['error'] = '402:%s:not-allowed' % client.clientId
            res['successful'] = False
            return
        super(SessionConnection, self).on_publish(cl, req, res)