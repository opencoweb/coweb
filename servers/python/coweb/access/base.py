'''
Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
class AccessBase(object):
    '''Base class for access manager.'''
    def __init__(self, container):
        self._container = container
        
    def on_admin_request(self, username, key, collab):
        '''
        Called when a user contacts the administrator to prepare a session.
        Expected to return a dictionary with additional information to return
        in the prepare response or to raise a tornado.web.HTTPError if the
        user cannot prepare the session.
        '''
        raise NotImplementedError
        
    def on_session_request(self, session, username):
        '''
        Called when a user attempts to join a coweb session. Expected to 
        return True if the user can join or False if not.
        '''
        raise NotImplementedError
    
    def on_service_subscribe(self, session, username, serviceName):
        '''
        Called when a user attempts to subscribe to a service in a session.
        Expected to return True if the user can subscribe or False if not.
        '''
        raise NotImplementedError

    def on_service_unsubscribe(self, session, username, serviceName):
        '''
        Called when a user attempts to unsubscribe from a service in a 
        session. Expected to return True if the user can unsubscribe or False 
        if not.
        '''
        raise NotImplementedError

    def on_service_request(self, session, username, serviceName):
        '''
        Called when a user attempts to send a request to a service in a 
        session. Expected to return True if the user can send the request or
        False if not.
        '''
        raise NotImplementedError
    
    def on_service_config(self, session, serviceName):
        '''
        Called when a service bot is launching. Expected to return a 
        dictionary with additional information to pass to the bot for
        configuration or raise an exception to prevent the start of the 
        service.
        '''
        raise NotImplementedError

    def on_service_acls(self, session, serviceName):
        '''
        Called when a service bot is about to launch to grant or deny it
        certain permissions. Expected to return a bit field of ACL_SERVICE_*
        constants representing the permissions granted.
        '''
        raise NotImplementedError