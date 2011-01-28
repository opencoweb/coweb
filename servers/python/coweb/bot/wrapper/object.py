'''
Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
# tornado
import tornado.ioloop
# std lib
import logging
import time
import weakref
import functools
# coweb
from base import BotWrapperBase

log = logging.getLogger('coweb.bot')

class ObjectBotWrapper(BotWrapperBase):
    def __init__(self, manager, botClass, serviceName, serviceToken, appData):
        self.serviceName = serviceName
        self.appData = appData
        self._serviceToken = serviceToken
        self._manager = weakref.proxy(manager)
        self._bot = botClass(self, serviceName, appData)
        self._ioLoop = tornado.ioloop.IOLoop.instance()

        # asynchronously inform local manager we're ready
        self.add_callback(self._manager.on_bot_ready, 
            serviceName, serviceToken, self)

    def on_message(self, mtdName, *args):
        '''Proxy messages from manager to bot impl.'''
        try:
            mtd = getattr(self._bot, mtdName)
        except AttributeError:
            # bot isn't listening for this message type
            return
        # keep sync with manager so we can catch exceptions, else exception
        # fires in context of original request which is wrong, it's a bot 
        # error not a client error
        try:
            mtd(*args)
        except Exception:
            log.exception('bot error')
    
    def reply(self, replyToken, data):
        '''Sends a private reply to a requestor.'''
        self._manager.on_bot_response(self.serviceName, replyToken, data)

    def publish(self, data):
        '''Sends a public reply to subscribes on a bot subchannel.'''
        self._manager.on_bot_publish(self.serviceName, data)

    def add_callback(self, callback, *args, **kwargs):
        '''Schedule a callback in the main loop.'''
        f = functools.partial(callback, *args, **kwargs)
        self._ioLoop.add_callback(f)
        
    def add_timer(self, delay, callback, *args, **kwargs):
        '''Add a one-shot timer that schedules a main loop callback.'''
        f = functools.partial(callback, *args, **kwargs)
        return self._ioLoop.add_timeout(time.time() + delay, f)
    
    def remove_timer(self, timer):
        '''Remove a one-shot timer.'''
        self._ioLoop.remove_timeout(timer)