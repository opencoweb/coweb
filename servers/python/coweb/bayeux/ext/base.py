'''
Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
class BayeuxExtBase(object):
    '''Base class for all bayeux extensions.'''    
    def on_handshake(self, client, connnection, request, response):
        '''
        Called before default processing of a /meta/handshake. Can modify
        the request or response dictionaries. No expected return value.
        '''
        pass

    def on_connect(self, cl, conn, req, res):
        '''
        Called after default processing of a /meta/connect. Can modify
        the request or response dictionaries. No expected return value.
        '''
        pass
        
    def on_disconnect(self, cl, conn, req, res):
        '''
        Called after default processing of a /meta/disconnect. Can modify
        the request or response dictionaries. No expected return value.
        '''
        pass

    def on_subscribe(self, cl, conn, req, res):
        '''
        Called after default processing of a /meta/subscribe. Can modify
        the request or response dictionaries. No expected return value.
        '''
        pass

    def on_unsubscribe(self, cl, conn, req, res):
        '''
        Called before default processing of a /meta/unsubscribe. Can modify
        the request or response dictionaries. No expected return value.
        '''
        pass

    def on_publish(self, cl, conn, req, res):
        '''
        Called before default processing of a /** publish. Can modify
        the request or response dictionaries. No expected return value.
        '''
        pass

    def on_flush(self, cl, timeout):
        '''Called before flushing outgoing messages. Expected to return None
        to allow default processing of the flush after the extension runs. 
        Expected to return True if a flush was performed by the extension or 
        False if the flush was not performed and the client queue should be
        rescheduled for a flush.
        '''
        pass

    def add_message(self, cl, msg, senderId):
        '''
        Called before queuing a message for a particular client. Expected to
        return False to prevent queuing the message or any other value to
        allow the queue.
        '''
        pass