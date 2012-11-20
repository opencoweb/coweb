'''
Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
# tornado
import tornado.web
import tornado.websocket
# std lib
import logging

log = logging.getLogger('bayeux.server')

class WebSocketBayeuxHandler(tornado.websocket.WebSocketHandler):
    '''Accepts bayeux protocol over WebSocket.'''
    def _execute(self, *args, **kwargs):
        # keep prepare extension point for subclasses
        self.prepare()
        super(WebSocketBayeuxHandler, self)._execute(*args, **kwargs)
    
    def prepare(self):
        self.require_setting('bayeux_manager', 'WebSocketBayeuxHandler')
        manager = self.settings['bayeux_manager']
        self.connection = manager.build_connection(self)
        
    def open(self, *args, **kwargs):
        '''Map tornado WS API to what we to use for client.'''
        self.on_ws_open(*args, **kwargs)
        
    def on_message(self, message):
        '''Map tornado WS API to what we use for client.'''
        self.on_ws_message(message)

    def on_close(self):
        '''Map tornado WS API to what we use for client.'''
        self.on_ws_close()

    def get_supported_connection_types(self):
        return ['websocket']

    def is_finished(self):
        # never finished until closed
        return False
        
    def send(self, data):
        self.write_message(data)
        
    def on_ws_open(self, message):
        '''Extension point. No default implementation.'''
        pass

    def on_ws_message(self, message):
        '''Extension point. Default forwards message to connection.'''
        self.connection.invoke(message)
    
    def on_ws_close(self):
        '''Extension point. No default implementation.'''
        pass

class HTTPBayeuxHandler(tornado.web.RequestHandler):
    '''Accepts Bayeux protocol over long-polling HTTP.'''
    def prepare(self):
        self.require_setting('bayeux_manager', 'HTTPBayeuxHandler')
        manager = self.settings['bayeux_manager']
        self.connection = manager.build_connection(self)
    
    def get_supported_connection_types(self):
        return ['long-polling']
        
    def close(self):
        self.finish()
        
    def is_finished(self):
        # let base class decide
        raise self._finished

    def send(self, data):
        self.finish(data)

    @tornado.web.asynchronous
    def post(self):
        # always the expected type
        self.set_header('Content-Type', 'application/javascript')
        body = self.request.body
        self.connection.invoke(body)
