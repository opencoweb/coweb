'''
Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
# std lib
import logging
import weakref
# coweb
import websocket

log = logging.getLogger('bayeux.client')

class BayeuxWebSocketTransport(websocket.WebSocketClient):
    '''WebSocket Bayeux client transport.'''
    def __init__(self, url, delegate):
        websocket.WebSocketClient.__init__(self, url)
        self._delegate = weakref.proxy(delegate)
        self._ready = False
        self._pending = []

    def get_supported_connection_types(self):
        return ['websocket']
    
    def on_ws_open(self):
        self._ready = True
        # send all pending
        map(self.send_bayeux, self._pending)

    def on_ws_message(self, msg):
        if self._delegate:
            self._delegate.invoke(msg)
    
    def send_bayeux(self, msg):
        if not self._ready:
            self._pending.append(msg)
        else:
            self.send_ws(msg)