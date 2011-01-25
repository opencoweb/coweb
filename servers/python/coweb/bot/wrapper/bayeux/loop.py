'''
Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
# std lib
import os
import logging
import asyncore

log = logging.getLogger('coweb.bot')

class AsyncoreLoop(object):
    '''Extends the asyncore main loop to support callbacks and timers.'''
    def __init__(self):
        self._callbacks = []
        # pipes to tickle select
        r, w = os.pipe()
        self._wpipe = os.fdopen(w, 'wb', 0)
        self._rpipe = os.fdopen(r, 'rb', 0)        
        asyncore.socket_map[self._rpipe.fileno()] = self

    def handle_read_event(self):
        # yank the sentinel out of the pipe
        self._rpipe.read(1)
        # execute all callbacks
        while self._callbacks:
            cb, args, kwargs  = self._callbacks.pop(0)
            try:
                cb(*args, **kwargs)
            except Exception:
                log.exception('bot callback')

    def readable(self):
        '''Want to monitor for sentinels on the read pipe.'''
        return True
    
    def writable(self):
        '''Never want to monitor when we can write, assuming always can.'''
        return False
        
    def add_callback(self, cb, args, kwargs):
        # schedule the callback
        self._callbacks.append((cb, args, kwargs))
        # tickle the write pipe
        try:
            self._wpipe.write('x')
        except (ValueError, IOError):
            pass

    def start(self):
        asyncore.loop()

    def stop(self):
        # cleanup our dummy pipes
        del asyncore.socket_map[self._rpipe.fileno()]
        self._wpipe.close()
        self._rpipe.close()