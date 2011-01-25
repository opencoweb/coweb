'''
Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
# tornado
from tornado.escape import json_encode, json_decode
# std lib
import logging
# coweb
from base import BayeuxExtBase

log = logging.getLogger('bayeux.server')

class BayeuxAckExt(BayeuxExtBase):
    '''
    Bayeux extension to require client acknowledgement of all sent 
    messages and total-ordering of all messages.
    '''
    def __init__(self):
        self.messages = []
        self._lastAck = -1
        self._ackId = 0
        self._queue = {}
        self._enabled = False
    
    def on_handshake(self, cl, conn, req, res):
        ext = req.get('ext')
        if ext is not None:
            self._enabled = ext.get('ack', False)
        else:
            self._enabled = False
        # always indicate ack supported, even if not requested
        ext = res.setdefault('ext', {})
        ext['ack'] = self._enabled

    def on_connect(self, cl, conn, req, res):
        # do nothing if ack not enabled
        if not self._enabled: return
        # get client ack # from message
        ext = req.get('ext', {})
        newAck = ext.get('ack', -1)
        # clean up any ack'ed messages
        for i in xrange(self._lastAck+1, newAck+1):
            #log.debug('clearing acked %d', i)
            try:
               del self._queue[i]
            except KeyError:
               pass
        # requeue any messages greater than client ack # ahead of the current
        # messages in the queue
        self.messages = []
        for i in xrange(newAck+1, self._ackId):
            #log.debug('requeing unacked %d', i)
            try:
                self.messages += self._queue[i]
            except KeyError:
                pass
        self._lastAck = newAck

    def on_flush(self, cl, timeout):
        # do nothing if ack not enabled
        if not self._enabled: return

        # respond on temp connection as needed, but only with meta messages
        if cl._tempConnection and cl._tempConnection != cl._lpConnection:
            # log.debug('ACK SENDING ON TEMP CONNECTION\n%s', cl._tempResponses)
            try:
                # dump just the meta responses
                cl._tempConnection.send(json_encode(cl._tempResponses))
            except Exception:
                # do nothing, but proceed to trying to handle messages
                pass
            else:
                # reset temp connection and response
                cl._tempConnection = None
                cl._tempResponses = []
                # log.debug('ACK SENT ON TEMP CONNECTION')
        
        # respond on the long poll with non-meta messages if
        # 1) this is a timeout, 2) this is the first connect response,
        # 3) we have something to send
        shouldSend = cl._lpFirst or len(cl._tempResponses) or len(self.messages) or len(cl.messages)
        if cl._lpConnection and (timeout or shouldSend):
            # combine the connection response, other meta messages, 
            # unacked messages, and any waiting event messages
            msgs = [cl._lpResponse] + cl._tempResponses + self.messages + cl.messages
            #log.debug('ACK SENDING ON LP CONNECTION\n%s', msgs)
            # add ack number to response
            ext = cl._lpResponse.setdefault('ext', {})
            ext['ack'] = self._ackId
            # increment the ack count
            self._ackId += 1
            # toss the disconnect timer if still running
            if not timeout and cl._lpTimer:
                try:
                    cl._ioloop.remove_timeout(cl._lpTimer)
                except ValueError:
                    pass
                cl._lpTimer = None
            # no longer the first long poll flush
            cl._lpFirst = False

            try:
                # dump the connection response + any waiting messages
                cl._lpConnection.send(json_encode(msgs))
            except Exception:
                # ignore, closed connection
                return False
            #log.debug('ACK SENT ON LP CONNECTION')

            # add the sent messages to the waiting ack queue
            self._queue[self._ackId-1] = cl.messages
            # reset message queue
            cl.messages = []
            # reset client connection and responses
            cl._lpConnection = None
            cl._lpResponse = None
            cl._tempResponses = []
            return True

        # we have something to send, but don't have a connection
        # make sure we stay marked to flush again
        return not shouldSend
