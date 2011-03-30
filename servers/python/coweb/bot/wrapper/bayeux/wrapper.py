'''
Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
# std lib
import logging
import json
import threading
# coweb
from bayeux import BayeuxClient

log = logging.getLogger('coweb.bot')

class BayeuxBotWrapper(BayeuxClient):
    '''
    Coweb bot wrapper that uses Bayeux to communicate with a coweb 
    server.
    '''
    def __init__(self, botClass, serviceName, serviceToken, ioLoop, 
    connectionInfo, appData):
        '''Override constructor to store session info.'''
        # pull url from connection info
        BayeuxClient.__init__(self, connectionInfo['url'])
        self.serviceName = serviceName
        self.appData = appData
        self._botClass = botClass
        self._serviceToken = serviceToken
        self._isSubbed = False
        self._bot = None
        self._ioLoop = ioLoop
 
        # channel name templates
        self._privateCh = '/service/bot/%s/' % self.serviceName
        self._publicCh = '/bot/%s' % self.serviceName

    def handshake(self, ext=None):
        '''
        Override handshake to include bot name and token for auth, queue
        subscribe to private channel.
        '''
        # include auth info in handshake
        ext = {} if ext is None else ext
        ext['authentication'] = dict(
            user=self.serviceName,
            password=self._serviceToken
        )
        # do handshake
        BayeuxClient.handshake(self, ext)
        
    def disconnect(self):
        '''Override to cleanup loop.'''
        self._ioLoop.stop()
        BayeuxClient.disconnect(self)
        
    def on_connect(self, msg):
        '''Called when connection to server succeeds.'''
        if not self._isSubbed:
            # subscribe to private bot channel
            self.subscribe('/service/bot/%s/*' % self.serviceName)
            self._isSubbed = True
    
    def on_subscribe(self, msg):
        '''Called when subscribe to private bot channel succeeds'''
        assert(msg['subscription'] == self._privateCh+'*')
        # create bot instance now that we're subscribed for requests
        try:
            self._bot = self._botClass(self, self.serviceName, self.appData)
        except Exception:
            log.exception('bot creation error')
            # give up on any failure
            self.disconnect()

    def on_message(self, msg):
        '''Called when bot receives a message on its private channel.'''
        if not self._bot: return
        pch = self._privateCh
        rch = msg['channel']
        if rch == pch+'request':
            data = msg['data']
            # dispatch private request
            try:
                mtd = self._bot.on_request
            except AttributeError, e:
                return
            mtd(data['value'], msg['id'], data['username'])
        elif rch == pch+'sync':
            data = msg['data']
            try:
                mtd = self._bot.on_sync
            except AttributeError:
                return
            mtd(data['syncData'], data['username'])
        elif rch == pch+'subscribe':
            data = msg['data']
            # dispatch private request
            try:
                mtd = self._bot.on_subscribe
            except AttributeError, e:
                return
            mtd(data['username'])
        elif rch == pch+'unsubscribe':
            data = msg['data']
            try:
                mtd = self._bot.on_unsubscribe
            except AttributeError, e:
                return
            mtd(data['username'])
        elif rch == pch+'shutdown':
            # dispatch shutdown notice
            try:
                mtd = self._bot.on_shutdown
            except AttributeError:
                mtd = None
                
            try:
                if mtd is not None:
                    mtd()
            finally:
                self._isSubbed = False
                try:
                    self.disconnect()
                except ValueError:
                    pass
        # ignore everything else

    def on_error(self, msg):
        '''Called on Bayeux error. Disconnects in critical cases.'''
        log.error(msg.get('error', 'unknown error'))
        if not self._bot: return
        ch = msg['channel']
        if ch in ('/meta/subscribe', '/meta/handshake', '/meta/connect') or \
        ch.startswith(self._privateCh) or ch.startswith(self._publicCh):
            # disconnect
            try:
                mtd = self._bot.on_shutdown
            except AttributeError:
                mtd = None
            try:
                if mtd is not None:
                    mtd()
            finally:
                self._isSubbed = False
                try:
                    self.disconnect()
                except ValueError:
                    pass

    def reply(self, replyToken, data):
        '''Sends a private reply to a requestor.'''
        BayeuxClient.publish(self, self._privateCh + 'response', data, 
            id=replyToken)

    def publish(self, data):
        '''Sends a public reply to subscribes on a bot subchannel.'''
        BayeuxClient.publish(self, self._publicCh, data)

    def add_callback(self, callback, *args, **kwargs):
        '''Schedule a callback in the main loop.'''
        self._ioLoop.add_callback(callback, args, kwargs)
        
    def add_timer(self, delay, callback, *args, **kwargs):
        '''Add a one-shot timer that schedules a main loop callback.'''
        t = threading.Timer(delay, self._ioLoop.add_callback, 
            [callback, args, kwargs])
        t.start()
        return t
    
    def remove_timer(self, timer):
        '''Removes a one-shot timer that hasn't fired yet.'''
        timer.cancel()
