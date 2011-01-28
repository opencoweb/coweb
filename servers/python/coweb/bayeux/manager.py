'''
Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
# tornado
import tornado.ioloop
# std lib
import logging
import time
# coweb
from session import BayeuxSession
from connection import BayeuxConnection
from channel import BayeuxChannel

log = logging.getLogger('bayeux.server')

class BayeuxManager(object):
    '''Base class for a Bayeux manager tracking known clients.'''
    def __init__(self, purgeInterval=15, deadAfter=60, exts=[], 
    client_cls=BayeuxSession, connection_cls=BayeuxConnection):
        self.deadAfter = deadAfter
        self.timeout = int(self.deadAfter/2.0)
        self._clientCls = client_cls
        self._connectionCls = connection_cls
        self._root = BayeuxChannel('/')
        self._clients = {}
        self._flushable = set()
        self._ioloop = tornado.ioloop.IOLoop.instance()
        self._purgeGen = None
        if purgeInterval is None:
            self._timer = None
        else:
            self._timer = tornado.ioloop.PeriodicCallback(self.purge_clients,
                purgeInterval*1000) 
            self._timer.start()
        self._exts = exts
        self._willFlush = False

    def destroy(self):
        '''Destroyes the Bayeux manager and deletes its known clients'''
        # stop the purge timer
        if self._timer is not None:
            # do after in case we're in the callback to prevent re-registration
            # due to tornado bug
            self._ioloop.add_callback(self._timer.stop)
            # force the callback reference to None, because stop doesn't
            # remove the reference from the ioloop, else gc impeded until
            # next callback occurs, even though stopped
            self._timer.callback = None
            self._timer = None
            self._purgeGen = None
        # purge all clients
        cids = self._clients.keys()
        for cid in cids:
            cl = self.delete_client(cid)
            cl.destroy()
        self._clients = {}

    def flush(self):
        '''Flushes all outgoing client messages immediately.'''
        self._willFlush = False
        leftover = set()
        while self._flushable:
            cl = self._flushable.pop()
            if not cl.on_flush():
                leftover.add(cl)
        # don't reschedule flush now, next connection will do it
        self._flushable = leftover

    def should_flush(self, cl):
        '''
        Marks a client as having outgoing messages that should be flushed.
        '''
        self._flushable.add(cl)
        # schedule the flush if not one already pending
        if not self._willFlush:
            self._ioloop.add_callback(self.flush)
            self._willFlush = True

    def publish(self, msg):
        '''Publishes a message to all clients subscribed to its channel.'''
        # strip off client ID before sending out to other clients
        try:
            senderId = msg['clientId']
            del msg['clientId']
        except KeyError:
            senderId = None
        try:
            del msg['id'] 
        except KeyError:
            pass
        ch = msg.get('channel', None)
        
        # find all subscribed clients
        clients = set()
        self._root.collect_clients(clients, BayeuxChannel.split(ch))
        for cl in clients:
            cl.add_message(msg, senderId)
                
    def get_root_channel(self):
        '''Gets the root / BayeuxChannel instance.'''
        return self._root

    def build_connection(self, handler):
        '''
        Builds a BayeuxConnection instance to represent a single connection
        over a negotiated transport from a client.
        '''
        return self._connectionCls(handler, self)

    def new_client(self):
        '''
        Builds a new BayeuxSession instance to represent a continuing session 
        with a client.'''
        c = self._clientCls(self, exts=self._exts)
        self._clients[c.clientId] = c
        return c
    
    def is_client(self, cid):
        '''Gets if the given client ID is one for a known client.'''
        return self._clients.has_key(cid)
        
    def get_client(self, cid):
        '''Gets the client associated with the given client ID.'''
        return self._clients[cid]
        
    def delete_client(self, cid):
        '''Deletes the client assocaited with the given client ID.'''
        cl = self._clients[cid]
        del self._clients[cid]
        try:
            self.on_purging_client(cid, cl)
        except Exception:
            log.exception('purge delegate')
        return cl
        
    def purge_clients(self):
        '''
        Purges clients that have not performed any action within the 
        configured self.deadAfter interval in seconds.
        '''
        if not self._purgeGen:
            # build a new purge generator
            self._purgeGen = self._purge_clients()
        try:
            # iterate the generator
            self._purgeGen.next()
        except StopIteration:
            # purge complete, toss the generator
            self._purgeGen = None
        else:
            # purge incomplete, schedule for immediately continuation
            self._ioloop.add_callback(self.purge_clients)

    def _purge_clients(self, timeout=2, blockSize=100):
        # snapshot the clients in the dict
        cids = self._clients.keys()
        # get the current time
        now = time.time()
        for i, cid in enumerate(cids):
            cl = self._clients[cid]
            if cl.lastSeen is None:
                self.delete_client(cid)
                cl.destroy()
                continue
            dt = now - cl.lastSeen
            if dt > self.deadAfter:
                cl = self.delete_client(cid)
                cl.destroy()
            if i % blockSize == 0 and time.time() - now > timeout:
                # we're taking too long, yield
                yield
    
    def on_purging_client(self, cid, cl):
        '''
        Called after this manager stops tracking a client but before the 
        BayeuxSession instace for the client is destroyed (i.e., it's 
        final messages flushed, sockets closed, etc.) No expected return 
        value.
        '''
        pass
