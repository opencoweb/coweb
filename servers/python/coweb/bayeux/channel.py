'''
Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
import weakref

class BayeuxChannel(object):
    '''Represents a Bayeux channel and operations on it.'''
    __slots__ = ('name', '_clients', '_subchannels')
    
    def __init__(self, name):
        self.name = name
        self._clients = []
        self._subchannels = {}

    def __repr__(self):
        return '<BayeuxChannel name=%s>' % self.name

    @classmethod
    def split(cls, name):
        return name.split('/')[1:] if name != '/' else []
        
    def _on_dead_client(self, wclient):
        try:
            self._clients.remove(wclient)
        except ValueError:
            pass

    def add_client(self, client, segs):
        if not segs:
            wclient = weakref.ref(client, self._on_dead_client)
            self._clients.append(wclient)
            return
        name = segs.pop(0)
        try:
            ch = self._subchannels[name]
        except KeyError:
            ch = BayeuxChannel(name)
            self._subchannels[name] = ch
        ch.add_client(client, segs)

    def remove_client(self, client, segs):
        if not segs:
            wclient = weakref.ref(client)
            self._clients.remove(wclient)
            return
        name = segs.pop(0)
        try:
            ch = self._subchannels[name]
        except KeyError:
            return
        ch.add_client(client, segs)
    
    def collect_clients(self, clients, segs):
        if not segs:
            clients.update([wclient() for wclient in self._clients])
            return

        # collect from ** if it exists
        try:
            ch = self._subchannels['**']
        except KeyError:
            pass
        else:
            ch.collect_clients(clients, None)
        
        # collect from * if one segment remains and * exists
        if len(segs) == 1:
            try:
                ch = self._subchannels['*']
            except KeyError:
                pass
            else:
                ch.collect_clients(clients, None)
        
        # collect from the proper subchannel
        name = segs.pop(0)
        try:
            ch = self._subchannels[name]
        except KeyError:
            pass
        else:
            ch.collect_clients(clients, segs)

if __name__ == '__main__':
    class Client: 
        def __init__(self, name): 
            self.name = name
        def __repr__(self):
            return str(self.name)

    root = BayeuxChannel('/')
    clients = [Client(i) for i in xrange(4)]
    subs = [
        [
            '/a',
            '/a/b',
            '/a/b/c'
        ],
        [
            '/*',
            '/a/*',
            '/a/b/c'
        ],
        [
            '/**'
        ],
        [
            '/',
            '/x',
            '/x/**'
        ]
    ]
    pubs = ['/', '/a', '/a/b', '/x', '/x/y/z', '/a/x/c', '/a/y']

    for i, sub in enumerate(subs):
        for s in sub:
            root.add_client(clients[i], BayeuxChannel.split(s))

    for pub in pubs:
        x = set()
        root.collect_clients(x, BayeuxChannel.split(pub))
        print pub, u'\u2192', x