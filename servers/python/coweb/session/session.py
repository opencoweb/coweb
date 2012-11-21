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
import configparser
import os
import uuid
import logging
import uuid
# coweb
from .. import bayeux
from .. import service
from .. import OEHandler
from ..moderator import SessionModerator

OEHandler = OEHandler.OEHandler
log = logging.getLogger('coweb.session')

def getServiceNameFromChannel(channel, pub):
    # Public channels are of form /bot/<NAME>
    # Private channels are of form /service/bot/<NAME>/(request|response)
    parts = channel.split("/")
    if pub:
        if 3 == len(parts):
            return parts[2]
    else:
        if 5 == len(parts) and \
                ("request" == parts[4] or "response" == parts[4]):
            return parts[3];
    return ""

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

        self.rosterAvailableChannel = '/session/%s/roster/available' % \
                self.sessionId
        self.rosterUnavailableChannel = '/session/%s/roster/unavailable' % \
                self.sessionId
        self.syncAppChannel = '/session/%s/sync/app' % self.sessionId
        self.syncEngineChannel = '/session/%s/sync/engine' % self.sessionId

        self._connectionClass = SessionConnection
        self._container = container
        self._application = container.webApp
        # bridge between users and service bots
        self._services = service.ServiceSessionBridge(container, self)

        # Operation total order, setup OP engine.
        self._opOrder = -1
        self._opengine = OEHandler(self, 0)

        # Use moderator?
        self._moderator = SessionModerator.getInstance(self,
                self._container.moderatorClass, self.key)

        self._handler = None

    """
       Publish a message form the moderator to all listening clients. This
       method doesn't actually send anything directly, but rather it delegates
       work to the OEHandler which sends the event and pushes the op to the
       local operation engine.
    """
    def publishModeratorSync(self, name, value, _type, position):
        self._opengine.localSync(name, value, _type, position)

    """
       Sends message on the /session/ID/sync/app channel. This is called from
       OEHandler to actually put the message on the wire.
    """
    def sendModeratorSync(self, message):
        cl = self._moderator.client
        req = cl.generate_message(self.syncAppChannel)
        req["data"] = message
        #self._handler.connection.invoke(json_encode([msg]));

        ch = req.get('channel', None)
        res = {'channel' : ch}
        mid = req.get('id', None)
        if mid: res['id'] = mid
        cid = req.get('clientId', '')

        res['advice'] = {'timeout' : self.timeout*1000}
        res['successful'] = True

        # invoke client and ext method first
        cl.on_publish(self, req, res)        
        # now invoke handler callbacks
        try:
            # delegate publish work to handler 
            self._connection.on_publish(cl, req, res)
        except Exception:
            log.exception('publish delegate')

    def build_connection(self, handler):
        '''Override to build proper connection.'''
        self._handler = handler
        self._connection = self._connectionClass(handler, self)
        return self._connection

    def start_session(self):
        '''Register session and service handlers.'''
        self._application.add_session_handler(self, SessionHandler)
        # delegate to service manager
        self._services.start_services()
        log.info('started session %s', self.sessionId)

    def end_session(self):
        '''Unregister session and service handlers.'''
        self._moderator._endSession()
        self._lateJoinHandler.endSession()
        self._lateJoinHandler = None
        self._moderator = None
        self._application.remove_session_handler(self)
        # delegate to service manager
        self._services.end_services()
        self.destroy()
        log.info('ended session %s', self.sessionId)

    def is_user_present(self, username):
        '''Gets if a user is present in the session by username.'''
        for cl in list(self._clients.values()):
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
            svcName = getServiceNameFromChannel(ch, False)
            # private bot message
            if self._manager._moderator.canClientMakeServiceRequest(svcName,
                    cl, req):
                if not self._manager.request_for_service(cl, req, res):
                    return
        elif not self._manager.collab:
            # disallow posting to any other channel by clients
            res['error'] = '402:%s:not-allowed' % client.clientId
            res['successful'] = False
            return
        super(SessionConnection, self).on_publish(cl, req, res)

