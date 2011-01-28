'''
Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
class BotWrapperBase(object):
    '''Base class for bot wrapper stating the interface expected by bots.'''
    def reply(self, replyToken, data):
        '''
        Sends a private reply to a requestor. The replyToken is one 
        previously passed to the bot along with a user request. Data is a
        JSON encodable object.
        '''
        raise NotImplementedError

    def publish(self, data):
        '''
        Sends a public reply to bot subscribers. Data is a JSON encodable 
        object.
        '''
        raise NotImplementedError

    def add_callback(self, callback, *args, **kwargs):
        '''Scheduled an asynchronous callback in the main bot loop.'''
        raise NotImplementedError

    def add_timer(self, delay, callback, *args, **kwargs):
        '''
        Adds a one-shot timer that schedules a main loop callback. The delay 
        is a float number of seconds. Returns an opaque token that the bot can
        use to cancel the timer before it fires.
        '''
        raise NotImplementedError
    
    def remove_timer(self, timer):
        '''Removes a one-shot timer before it fires.'''
        raise NotImplementedError