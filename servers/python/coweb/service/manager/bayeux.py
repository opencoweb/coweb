'''
Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
# tornado
import tornado.ioloop
# std lib
import logging
import uuid
import weakref
import time
import socket
# coweb
from ... import bayeux
from base import ServiceManagerBase

log = logging.getLogger('coweb.service')

class BayeuxServiceManager(bayeux.BayeuxManager, ServiceManagerBase):
    def __init__(self, container, bridge):
        # initialize base classes independently
        ServiceManagerBase.__init__(self, container, bridge)
        # no purging because websocket only right now, require auth ext
        bayeux.BayeuxManager.__init__(self, purgeInterval=None,
            exts=[bayeux.BayeuxAuthExt])

        # store session id for reuse
        self._sessionId = self._bridge.get_session_id()
        # store web root for reuse
        self._webRoot = self._container.webRoot

    def build_connection(self, handler):
        '''Overrides to build connection for services.'''
        return ServiceConnection(handler, self)

    def start_services(self):
        '''Registers a service handler for this session.'''
        app = self._container.webApp
        # register url for bayeux service handler
        pattern = '%sservices/(%s)/?.*' % (self._webRoot, self._sessionId)
        app.extend_handlers(r'.*$', [(pattern, ServiceHandler)])

    def end_services(self):
        '''Unregisters a service handler for this session.'''
        app = self._container.webApp
        sessionId = self._bridge.get_session_id()
        # unregister url for bayeux service handler
        pattern = '%sservices/(%s)/?.*' % (self._webRoot, self._sessionId)
        app.remove_handler(r'.*$', pattern)
        # clean up BayeuxManager self
        self.destroy()
        
    def get_manager_id(self):
        '''Return unique ID of the service manager to pair with bot wrapper.'''
        return 'bayeux'
    
    def get_connection_info(self):
        '''Return services URL for the session.'''
        app = self._container.webApp
        info = {'url' : 'ws://%s:%d%sservices/%s' % (
            socket.gethostbyname(socket.gethostname()), # or use fqd?
            self._container.httpPort,
            self._webRoot, 
            self._sessionId)
        }
        return info

    def send_message(self, msg, cl):
        '''Sends a message to a bot on behalf of the bridge.'''
        cl.add_message(msg)

    def on_user_subscribe(self, serviceName, username):
        '''Builds a user subscribe notification to a bot.'''
        return {
            'channel':'/service/bot/%s/subscribe' % serviceName,
            'data': {
                'username': username
            }
        }
    
    def on_user_unsubscribe(self, serviceName, username):
        '''Builds a user unsubscribe notification to a bot.'''
        return {
            'channel':'/service/bot/%s/unsubscribe' % serviceName,
            'data': {
                'username': username
            }
        }

    def on_user_request(self, serviceName, username, token, value):
        '''Builds a user request to a bot.'''
        return {
            'channel' : '/service/bot/%s/request' % serviceName,
            'data' : {
                'value' : value,
                'username' : username
            },
            'id' : token
        }

    def on_user_sync(self, serviceName, username, syncData):
        '''Builds a user sync event to forward to a bot.'''
        return {
            'channel' : '/service/bot/%s/sync' % serviceName,
            'data' : {
                'syncData' : syncData,
                'username' : username
            }
        }

    def on_shutdown_request(self, serviceName):
        '''Builds a bot a shutdown notice.'''
        return {
            'channel' : '/service/bot/%s/shutdown' % serviceName,
            'data' : {}
        }
    
    def remove_bad_client(self, cl):
        '''Removes a misbehaving bot.'''
        self.delete_client(cl.clientId)
        cl.destroy()

    def on_bot_response(self, client, req, res):
        '''Pass-through to send a bot response to a user.'''
        try:
            # pull the response token from the message
            token = req['id']
        except KeyError:
            res['successful'] = False
            res['error'] = '400:%s:missing-id' % bot.clientId
            return False
        # send response
        try:
            self._bridge.on_bot_response(client.username, token, req['data'])
        except (KeyError, ValueError):
            # not a valid response
            res['successful'] = False
            res['error'] = '402:%s:not-allowed' % bot.clientId
            return False
        return True
        
    def on_bot_publish(self, client, req, res):
        '''Pass-through to publish a bot response to all users.'''
        try:
            self._bridge.on_bot_publish(client.username, req['data'])
        except ValueError:
            res['successful'] = False
            res['error'] = '402:%s:not-allowed' % bot.clientId
            return False
        
    def auth_bot(self, cl, serviceName, token):
        '''Pass-through for handler to auth bot.'''
        return self._bridge.auth_bot(serviceName, token, cl)
        
    def mark_bot_subscribed(self, serviceName):
        '''Pass-through for handler to mark a bot as subscribed.'''
        self._bridge.mark_bot_subscribed(serviceName)
        
    def on_purging_client(self, clientId, client):
        '''Inform bridge that client is no longer alive.'''
        self._bridge.deactivate_bot(client.username)

class ServiceHandler(bayeux.WebSocketBayeuxHandler):
    '''Handler for service bots.'''
    def prepare(self):
        # don't do prepare logic, need session id to get manager
        pass

    def on_ws_open(self, sessionId):
        '''Fetch manager and build connection here once we have session id.'''
        try:
            session = self.application.get_session_obj(sessionId)
        except KeyError:
            # session going away, ignore
            raise tornado.web.HTTPError(500)
        manager = session.get_service_manager()
        self.connection = manager.build_connection(self)

class ServiceConnection(bayeux.BayeuxConnection):
    '''Connection for service bots.'''
    def on_auth_ext(self, cl, auth):
        '''Overrides to check bot credentials.'''
        return self._manager.auth_bot(cl, auth['user'], auth['password'])
    
    def on_handshake(self, cl, req, res):
        '''Overrides to associates a bot state with its connection.'''
        if res['successful']:
            # make the service name the username on the bayeux client
            cl.username = req['ext']['authentication']['user']

    def on_subscribe(self, cl, req, res):
        '''Overrides to handle bot subscriptions.'''
        # ensure bot subscribing to its own channel
        correct = '/service/bot/%s/*' % cl.username
        sub = req['subscription']
        if sub != correct:
            # not allowed to subscribe to other chnanels, disconnect bad bot
            self._manager.remove_bad_client(cl)
            return
        # run base class subscription logic
        super(ServiceConnection, self).on_subscribe(cl, req, res)
        # tell manager bot is now subscribed and ready for messages
        self._manager.mark_bot_subscribed(cl.username)

    def on_publish(self, cl, req, res):
        '''Overrides to handle bot responses.'''
        # ensure bot publishing to its public or private channel
        ch = req['channel']
        if ch == '/service/bot/%s/response' % cl.username:
            # handle private response
            self._manager.on_bot_response(cl, req, res)
        elif ch == '/bot/%s' % cl.username:
            # handle public response
            self._manager.on_bot_publish(cl, req, res)
        else:
            # not allowed to publish to other chnanels, disconnect bad bot
            self._manager.remove_bad_client(cl)