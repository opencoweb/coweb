'''
Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
class BotState(object):
    '''Represents the state of a launched bot.'''
    STARTING = 0
    AUTHED = 1
    SUBSCRIBED = 2
    def __init__(self, serviceName, token, acls):
        self.serviceName = serviceName
        self.acls = acls
        self.impl = None
        self.queue = []
        self.token = token
        self._state = self.STARTING
        self._pendingResponses = {}

    def __repr__(self):
        return '<BotState state=%s>' % ['STARTING', 'AUTHED', 'SUBSCRIBED'][self._state]

    def set_authed(self, impl):
        '''Moves bot to authenticated state. Ready to subscribe.'''
        self.token = None
        self._state = self.AUTHED
        self.impl = impl
        
    def set_subscribed(self):
        '''Moves bot to subscribed state. Ready for requests and responses.'''
        if self._state < self.AUTHED:
            raise ValueError('cannot mark bot subscribed, never authed')
        self._state = self.SUBSCRIBED
        q = self.queue
        self.queue = None
        return q
    
    def is_subscribed(self):
        '''Checks if bot is subscribed to its private channel.'''
        return self._state == self.SUBSCRIBED
        
    def push_request(self, token, *args):
        '''Adds a request tracked for a later response by the bot.'''
        self._pendingResponses[token] = args
    
    def pop_request(self, token):
        '''Removes a tracked request on bot response.'''
        args = self._pendingResponses[token]
        del self._pendingResponses[token]
        return args