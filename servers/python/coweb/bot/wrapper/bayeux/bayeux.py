'''
Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
# std lib
import logging
import json
# coweb
import transport

log = logging.getLogger('bayeux.client')

class BayeuxClient(object):
    '''Implements Bayeux client logic.'''
    STATE_DISCONNECTED = 0
    STATE_CONNECTING = 1
    STATE_CONNECTED = 2
    STATE_DISCONNECTING = 3
    def __init__(self, url):
        self._url = url
        self._version = '1.0'
        self._clientId = None
        self._state = self.STATE_DISCONNECTED
        if url.startswith('ws://') or url.startswith('wss://'):
            self._transport_cls = transport.BayeuxWebSocketTransport
        else:
            raise NotImplementedError('no transport available for %s' % url)
        
    def handshake(self, ext=None):
        '''Initiates a handshake over a new transport.'''
        if not self._state == self.STATE_DISCONNECTED:
            raise ValueError('cannot handshake in current state')
            
        # build and initiate the transport
        self._state = self.STATE_CONNECTING
        self._transport = self._transport_cls(self._url, self)

        # start the handshake
        msg = dict(
            channel='/meta/handshake', 
            version=self._version,
            minimumVersion=self._version,
            supportedConnectionTypes=self._transport.get_supported_connection_types()
        )

        # mix in extensions
        if ext is not None:
            msg['ext'] = ext
        
        self._send(msg)

    def connect(self):
        '''Does a connect.'''
        if not self._state == self.STATE_CONNECTING:
            raise ValueError('cannot connect in current state')
        # make a connection
        msg = dict(
            channel='/meta/connect', 
            clientId=self._clientId,
            connectionType=self._transport.get_supported_connection_types()[0]
        )
        self._send(msg)

    def disconnect(self):
        '''Does a disconnect.'''
        if not self._state == self.STATE_CONNECTED:
            raise ValueError('cannot disconnect in current state')
        # reset client info now
        self._subscriptions = {}
        self._pendingSubs = {}
        self._state = self.STATE_DISCONNECTING
        
        # disconnect
        msg = dict(
            channel='/meta/disconnect', 
            clientId=self._clientId
        )
        self._send(msg)
        
        # leave transport connected until response arrives
        self._clientId = None

    def publish(self, channel, data, **kwargs):
        '''Publishes a message.'''
        if not self._state == self.STATE_CONNECTED:
            raise ValueError('cannot publish in current state')

        # send a message
        msg = dict(
            channel=channel,
            clientId=self._clientId,
            data=data
        )
        # mixin any additional kwargs
        msg.update(kwargs)
        self._send(msg)
        
    def subscribe(self, channel):
        '''Subscribes to a channel.'''
        if not self._state == self.STATE_CONNECTED:
            raise ValueError('cannot subscribe in current state')
        # send subscribe request
        msg = dict(
            channel='/meta/subscribe',
            clientId=self._clientId,
            subscription=channel
        )
        self._send(msg)
        
    def unsubscribe(self, channel):
        '''Unsubscribes from a channel.'''
        if not self._state == self.STATE_CONNECTED:
            raise ValueError('cannot unsubscribe in current state')
        # send unsubscribe request
        msg = dict(
            channel='/meta/unsubscribe',
            clientId=self._clientId,
            subscription=channel
        )
        self._send(msg)

    def _send(self, *args):
        '''Sends one or more messages over the current transport.'''
        self._transport.send_bayeux(json.dumps(args))

    def invoke(self, msg):
        '''Called when the transport receives bayeux messages.'''
        try:
            reqs = json.loads(msg)
        except Exception:
            log.exception('json decode')
            self._transport.close()
            return

        for req in reqs:
            ch = req['channel']
            if ch.startswith('/meta'):
                mtd = ch.replace('/', '_')
                try:
                    abort = getattr(self, mtd)(req)
                except Exception:
                    # ignore errors, just log 'em
                    log.exception('meta handler')
                    continue
                if abort: break
            else:
                # publish on custom channel
                try:
                    abort = self._publish(req)
                except Exception:
                    # ignore errors, just log 'em
                    log.exception('publish handler')
                    continue
                if abort: break
    
    def on_handshake(self, msg):
        '''Called on a successful handshake. Default does a connect.'''
        self.connect()

    def on_connect(self, msg):
        '''Called on a successful connect. No default implementation.'''
        pass

    def on_disconnect(self, msg):
        '''Called on a successful disconnect. No default implementation.'''
        pass

    def on_subscribe(self, msg):
        '''Called on a successful subscribe. No default implementation.'''
        pass

    def on_unsubscribe(self, msg):
        '''Called on a successful unsubscribe. No default implementation.'''
        pass

    def on_publish(self, msg):
        '''Called on ack of published data. No default implementation.'''
        pass

    def on_message(self, msg):
        '''Called on published data. No default implementation.'''
        pass

    def on_error(self, msg):
        '''Called on an unsuccessful response. Logs the error message.'''
        log.error(msg)

    def _meta_handshake(self, msg):
        '''Handles a handshake response.'''
        if msg['successful']:
            self._clientId = msg['clientId']
            self.on_handshake(msg)
        else:
            try:
                self.on_error(msg)
            finally:
                # close connection
                self._transport.close()

    def _meta_connect(self, msg):
        '''Handles a connect response.'''
        if msg['successful']:
            self._state = self.STATE_CONNECTED
            self.on_connect(msg)
        else:
            try:
                self.on_error(msg)
            finally:
                # close connection
                self._transport.close()

    def _meta_disconnect(self, msg):
        '''Handles a disconnect response.'''
        if msg['successful']:
            try:
                self._state = self.STATE_DISCONNECTED
                self.on_disconnect(msg)
            finally:
                # close connection
                self._transport.close()                
        else:
            try:
                self.on_error(msg)
            finally:
                # close connection
                self._transport.close()
    
    def _meta_subscribe(self, msg):
        '''Handles a subscribe response.'''
        if msg['successful']:
            self.on_subscribe(msg)
        else:
            self.on_error(msg)
    
    def _meta_unsubscribe(self, msg):
        '''Handles an unsubscribe response.'''
        if msg['successful']:
            self.on_unsubscribe(msg)
        else:
            self.on_error(msg)

    def _publish(self, msg):
        '''Handles a message or publish ack.'''
        if msg.has_key('successful'):
            if msg['successful']:
                self.on_publish(msg)
            else:
                self.on_error(msg)
        else:
            self.on_message(msg)