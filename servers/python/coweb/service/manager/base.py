'''
Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
import weakref

class ServiceManagerBase(object):
    '''Base class for service manager.'''
    def __init__(self, container, bridge):
        self._bridge = weakref.proxy(bridge)
        self._container = container

    def get_manager_id(self):
        '''
        Called to get the unique identifier of this manager. Used by a bot
        wrapper to determine the method of communication with the manager.
        Expected to return a string unique across all service manager 
        implementations. 
        '''
        raise NotImplementedError

    def get_connection_info(self):
        '''
        Called to get a dictionary of custom information to be provided to
        a service bot upon its launch. Used by the bot wrapper to determine
        how to communicate with the manager. Expected to return a dictionary.
        '''
        raise NotImplementedError
        
    def start_services(self):
        '''
        Called to initialize the service manager. No expected return value.
        '''
        raise NotImplementedError
        
    def end_services(self):
        '''
        Called to uninitialize the service manager after a delay to allow
        services to shutdown gracefully. No expected return value.
        '''
        raise NotImplementedError
    
    def send_message(self, msg, impl):
        '''
        Called to send a message to a service bot using whatever method of
        communication the manager and bot wrapper support. The message is an
        object returned by one of the on_* requests. The impl object is 
        what object the manager passes to the service bridge in the 
        set_authed() call. This method is not invoked until the bot is 
        reported as authenticated and subscribed. No expected return value.
        '''
        raise NotImplementedError
        
    def on_user_request(self, serviceName, username, token, value):
        '''
        Called to build a private user request message for a bot. Expects any
        return value that can later serve as a parameter to send_message.
        '''
        raise NotImplementedError
        
    def on_user_subscribe(self, serviceName, username):
        '''
        Called to build a user subscription message for a bot. Expects any
        return value that can later serve as a parameter to send_message.
        '''
        raise NotImplementedError
        
    def on_user_unsubscribe(self, serviceName, username):
        '''
        Called to build a user unsubscribe message for a bot. Expects any
        return value that can later serve as a parameter to send_message.
        '''
        raise NotImplementedError
    
    def on_shutdown_request(self, serviceName):
        '''
        Called to build a shutdown request message for a bot. Expects any
        return value that can later serve as a parameter to send_message.
        '''
        raise NotImplementedError
    
    def on_user_sync(self, serviceName, username, data):
        '''
        Called to build a sync message for a bot. Expects any return value 
        that can later serve as a parameter to send_message.
        '''
        raise NotImplementedError