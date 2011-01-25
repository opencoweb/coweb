'''
Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
# tornado
from tornado.escape import json_encode, json_decode
# std lib
import logging
import weakref

log = logging.getLogger('bayeux.server')

class BayeuxConnection(object):
    '''Base class representing a single connection from a client.'''
    def __init__(self, handler, manager):
        # don't impede gc
        self._handler = weakref.proxy(handler)
        self._manager = weakref.proxy(manager)

    def invoke(self, body):
        try:
            reqs = json_decode(body)
        except Exception:
            log.exception('json decode')
            res = self.__build_bad_json()
            self.send(json_encode([res]))
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

    def send(self, data):
        '''Proxy for handler send method.'''
        self._handler.send(data)
        
    def is_finished(self):
        '''Proxy for handler is_finished method.'''
        return self._handler.is_finished()
        
    def close(self):
        '''Proxy for handler close method.'''
        self._handler.close()
        
    def on_auth_ext(self, cl, auth):
        '''
        Called by the authentication extension (if enabled). Allows all users
        to handshake by default. Expects True to allow users or False to 
        disallow them from handshaking.
        '''
        return True

    def on_handshake(self, cl, req, res):
        '''
        Called to handle /meta/handshake. No default behavior or expected 
        return value.
        '''
        pass

    def on_connect(self, cl, req, res):
        '''
        Called to handle /meta/connect. No default behavior or expected 
        return value.
        '''
        pass

    def on_disconnect(self, cl, req, res):
        '''
        Called to handle /meta/disconnect. The BayeuxSession instance provided
        is no longer tracked by the BayeuxManager by the time this method is
        called. Default destroys the client. No expected return value.
        '''
        cl.destroy()

    def on_subscribe(self, cl, req, res):
        '''
        Called to handle /meta/subscribe. Default adds client to requested
        channel as long as the channel is not prefixed with /service and no
        error occurred beforehand. No expected return value.
        '''
        if res['successful'] and not req['subscription'].startswith('/service/'):
            # add subscription to non-service channel
            cl.add_channel(req.get('subscription', None))

    def on_unsubscribe(self, cl, req, res):
        '''
        Called to handle /meta/unsubscribe. Default removes client from the
        requested channel as long as the channel is not prefixed with /service
        and no error occurred beforehand. No expected return value.
        '''
        subs = req.get('subscription')
        if res['successful'] and subs is not None and not subs.startswith('/service/'):
            cl.delete_channel(subs)

    def on_publish(self, cl, req, res):
        '''
        Called to handle a publish message. Default publishes the message to
        all clients as long as the channel is no prefixed with /service and
        no error occurred beforehand. No expected return value.
        '''
        if res['successful'] and not req['channel'].startswith('/service/'):
            self._manager.publish(req)
    
    def on_unknown_client(self, res):
        '''
        Called to handle an unknown client error. Default suggests another
        handshake attempt. No expected return value.
        '''
        res['advice'] = {'reconnect' : 'handshake'}
        
    def __build_bad_json(self):
        res = {}
        res['successful'] = False
        res['error'] = '500::bad-json'
        res['advice'] = {'reconnect' : 'none'}
        return res
        
    def __build_unknown_client(self, cid):
        res = {}
        res['successful'] = False
        res['clientId'] = cid
        res['error'] = '402:%s:unknown clientId' % cid
        try:
            self.on_unknown_client(res)
        except Exception:
            log.exception('unknown client delegate')
        return res

    def _meta_handshake(self, req):
        res = {'channel' : '/meta/handshake'}
        mid = req.get('id', None)
        if mid: res['id'] = mid
        # let handler dictate supported connection type
        server_types = self._handler.get_supported_connection_types()
        res['supportedConnectionTypes'] = server_types
        # check what client requested
        client_types = req.get('supportedConnectionTypes', [])
        # make sure at least one connection type is common
        if not set(server_types).intersection(set(client_types)):
            cl = None
            res['successful'] = False
            res['error'] = '412::unsupported connection type'
            self.send(json_encode([res]))
            return True
        else:
            # @todo: version check
            cl = self._manager.new_client()
            res['clientId'] = cl.clientId
            res['successful'] = True
            res['version'] = '1.0'
            res['advice'] = {
                'reconnect' : 'retry', 
                'timeout' : self._manager.timeout*1000
            }
        # invoke client and ext method first
        cl.on_handshake(self, req, res)        
        # now invoke handler callbacks
        try:
            self.on_handshake(cl, req, res)
        except Exception:
            log.exception('handshake delegate')
        if not res['successful'] and cl:
            # delete any client created if not successful
            self._manager.delete_client(cl.clientId)
            cl.destroy()
        # nothing allowed after handshake
        self.send(json_encode([res]))
        return True

    def _meta_connect(self, req):
        res = {'channel' : '/meta/connect'}
        mid = req.get('id', None)
        if mid: res['id'] = mid
        cid = req.get('clientId', '')
        try:
            cl = self._manager.get_client(cid)
        except KeyError:
            # force a handshake
            res.update(self.__build_unknown_client(cid))
            self.send(json_encode([res]))
            return True
        else:
            res['advice'] = {'timeout' : self._manager.timeout*1000}
            res['successful'] = True
        # invoke client and ext method first
        cl.on_connect(self, req, res)        
        # now invoke handler callbacks
        try:
            self.on_connect(cl, req, res)
        except Exception:
            log.exception('connect delegate')
        if cl.count_messages():
            # flush if there are waiting msgs
            cl.should_flush()

    def _meta_disconnect(self, req):
        res = {'channel' : '/meta/disconnect'}
        mid = req.get('id', None)
        if mid: res['id'] = mid
        cid = req.get('clientId', '')
        try:
            cl = self._manager.delete_client(cid)
        except KeyError:
            # force a handshake
            res.update(self.__build_unknown_client(cid))
            self.send(json_encode([res]))
            return True
        else:
            res['advice'] = {'timeout' : self._manager.timeout*1000}
            res['successful'] = True
        # invoke client and ext method first
        cl.on_disconnect(self, req, res)
        # now invoke handler callbacks
        try:
            self.on_disconnect(cl, req, res)
        except Exception:
            log.exception('disconnect delegate')
        cl.should_flush()
        
    def _meta_subscribe(self, req):
        res = {
            'channel' : '/meta/subscribe', 
            'subscription' : req['subscription']
        }
        mid = req.get('id', None)
        if mid: res['id'] = mid
        cid = req.get('clientId', '')
        try:
            cl = self._manager.get_client(cid)
        except KeyError:
            # force a handshake
            res.update(self.__build_unknown_client(cid))
            self.send(json_encode([res]))
            return True
        else:
            res['advice'] = {'timeout' : self._manager.timeout*1000}
            res['successful'] = True
        # invoke client and ext method first
        cl.on_subscribe(self, req, res)        
        # now invoke handler callbacks
        try:
            # delegate subscribe work to handler
            self.on_subscribe(cl, req, res)
        except Exception:
            log.exception('subscribe delegate')
        cl.should_flush()
            
    def _meta_unsubscribe(self, req):
        res = {'channel' : '/meta/subscribe'}
        mid = req.get('id', None)
        if mid: res['id'] = mid
        cid = req.get('clientId', '')
        try:
            cl = self._manager.get_client(cid)
        except KeyError:
            res.update(self.__build_unknown_client(cid))
            self.send(json_encode([res]))
            return True
        else:
            res['advice'] = {'timeout' : self._manager.timeout*1000}
            res['successful'] = True
        # invoke client and ext method first
        cl.on_unsubscribe(self, req, res)        
        # now invoke handler callbacks
        try:
            # delegate unsubscribe work to handler 
            self.on_unsubscribe(cl, req, res)
        except Exception:
            log.exception('unsubscribe delegate')
        cl.should_flush()

    def _publish(self, req):
        ch = req.get('channel', None)
        res = {'channel' : ch}
        mid = req.get('id', None)
        if mid: res['id'] = mid
        cid = req.get('clientId', '')
        try:
            cl = self._manager.get_client(cid)
        except KeyError:
            # force a handshake
            res.update(self.__build_unknown_client(cid))
            self.send(json_encode([res]))
            return True

        if ch and ch.find('*') > -1:
            # disallow publish using wildcard symbols
            res['successful'] = False
            res['error'] = '409:%s:cannot publish using wildcard "*"' % cid
        else:
            res['advice'] = {'timeout' : self._manager.timeout*1000}
            res['successful'] = True

        # invoke client and ext method first
        cl.on_publish(self, req, res)        
        # now invoke handler callbacks
        try:
            # delegate publish work to handler 
            self.on_publish(cl, req, res)
        except Exception:
            log.exception('publish delegate')
        cl.should_flush()