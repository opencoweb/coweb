'''
Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
# tornado
import tornado.ioloop
from tornado.escape import json_encode, json_decode
# std lib
import uuid
import logging
import weakref
import time
# coweb
from channel import BayeuxChannel

log = logging.getLogger('bayeux.server')

class BayeuxSession(object):
    '''Base class representing a continuing session with a Bayeux client.'''
    def __init__(self, manager, exts=[], ioloop=None):
        self.clientId = uuid.uuid4().hex
        self.username = None
        self.lastSeen = None
        self.messages = []
        self._lpConnection = None
        self._lpResponse = None
        self._lpTimer = None
        self._tempConnection = None
        self._tempResponses = []
        self._manager = weakref.proxy(manager)
        self._ioloop = ioloop or tornado.ioloop.IOLoop.instance()
        self._lpFirst = True
        # build instances of all exts
        self._exts = [ext() for ext in exts]
    
    def __repr__(self):
        return '<BayeuxSession username=%s, lastSeen=%s>' % (self.username,
            self.lastSeen)

    def _run_exts(self, mtd, *args):
        rv = None
        # trigger extensions
        for ext in self._exts:
            try:
                rvNew = getattr(ext, mtd)(self, *args)
            except Exception:
                log.exception('ext error')
                continue
            rv = rvNew if rvNew is not None else rv
        return rv

    def destroy(self):
        try:
            # try to send any remaining messages
            self.on_flush()
        except Exception:
            pass
        try:
            # force the long poll connection to close
            self._lpConnection.close()
        except Exception:
            pass
        try:
            self._ioloop.remove_timeout(self._lpTimer)
        except Exception:
            pass
        self._lpConnection = None
        try:
            # force the temporary connection to close
            self._tempConnection.close()
        except Exception:
            pass
        self._tempConnection = None

        # destroy io loop as sentinel that we're shutting down
        self._ioloop = None

    def on_handshake(self, conn, req, res):
        # invoke exts
        self._run_exts('on_handshake', conn, req, res)
        
    def on_connect(self, conn, req, res):
        # do default handling for long poll
        if self._lpFirst:
            # force first long poll connection to return right away to
            # indicate the connection succeeded
            self.should_flush()
        # this is the long poll connection
        self._lpConnection = conn
        self._lpResponse = res
        # close long poll when timeout occurs
        self._lpTimer = self._ioloop.add_timeout(
            time.time()+self._manager.timeout, 
            self.on_flush_timeout)
        self.lastSeen = time.time()
        # invoke exts
        self._run_exts('on_connect', conn, req, res)

    def on_disconnect(self, conn, req, res):
        self._tempConnection = conn
        self._tempResponses.append(res)
        # invoke exts
        self._run_exts('on_disconnect', conn, req, res)
    
    def on_subscribe(self, conn, req, res):
        self._tempConnection = conn
        self._tempResponses.append(res)
        # invoke exts
        self._run_exts('on_subscribe', conn, req, res)
        
    def on_unsubscribe(self, conn, req, res):
        self._tempConnection = conn
        self._tempResponses.append(res)
        # invoke exts
        self._run_exts('on_unsubscribe', conn, req, res)

    def on_publish(self, conn, req, res):
        self._tempConnection = conn
        # @todo: disabled pub response for speed; MAY in spec anyways
        self._tempResponses.append(res)
        # invoke exts
        self._run_exts('on_publish', conn, req, res)

    def add_message(self, msg, sender=None):
        # invoke exts
        rv = self._run_exts('add_message', msg, sender)
        # only queue the message if no extension ran or no ext prevented it
        if rv is None or rv:
            self.messages.append(msg)
            self.should_flush()

    def count_messages(self):
        return len(self.messages)

    def delete_channel(self, ch):
        root = self._manager.get_root_channel()
        root.remove_client(self, BayeuxChannel.split(ch))

    def add_channel(self, ch):
        root = self._manager.get_root_channel()
        root.add_client(self, BayeuxChannel.split(ch))

    def should_flush(self):
        self._manager.should_flush(self)
        
    def on_flush_timeout(self):
        self.on_flush(True)

    def on_flush(self, timeout=False):
        if self._ioloop is None:
            # shut down, drop everything
            return True
        
        rv = self._run_exts('on_flush', timeout)
        if rv is not None:
            # some extension triggered the abort
            return rv

        if self._tempConnection and self._tempConnection != self._lpConnection:
            # respond on the temporary connection
            conn = self._tempConnection
            # combine meta responses and messages
            msgs = self._tempResponses + self.messages
            #log.debug('SENDING ON TEMP CONNECTION %s', msgs)
        elif self._lpConnection:
            # respond on the long poll if no temp or ack extension enabled
            conn = self._lpConnection
            # combine the meta connect response, other meta responses, and messages
            msgs = self._tempResponses + self.messages
            if self._lpResponse:
                msgs = [self._lpResponse] + msgs
            #log.debug('SENDING ON LP CONNECTION %s', msgs)
            # toss the disconnect timer if still running
            if not timeout and self._lpTimer:
                try:
                    self._ioloop.remove_timeout(self._lpTimer)
                except ValueError:
                    pass
                self._lpTimer = None
            # no longer the first long poll flush
            self._lpFirst = False
        else:
            # no connection, can't flush yet
            return False

        try:
            # dump the connection response + any waiting messages
            conn.send(json_encode(msgs))
        except Exception, e:
            # closed connection; keep messages around for retry later
            # @todo: should we try dumping events on the long poll too?
            #  probably triggered by a publish so no need here?
            return False
        finally:
            if conn == self._tempConnection and conn.is_finished():
                # reset temp connection
                self._tempConnection = None
            if conn == self._lpConnection:
                # reset long poll and response
                if conn.is_finished():
                    self._lpConnection = None
                self._lpResponse = None            
        log.debug('SENT ON CONNECTION')

        # reset message queue
        self.messages = []
        # reset meta responses
        self._tempResponses = []
        return True
