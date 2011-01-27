'''
Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
class AuthBase(object):
    '''Base class for authentication manager.'''
    def __init__(self, container):
        self._container = container

    def requires_login(self):
        '''
        Called to determine if this authentication manager requires a user to
        enter a username and password into the configured login handler.
        Execpted to return True if login is required or False if not.
        '''
        raise NotImplementedError
        
    def requires_cookies(self):
        '''
        Called to determine if this authentication manager requires the use
        of tornado's secure cookie implementation. Expected to return True if
        secure cookies will be used so that tornado can be configured properly
        with a secret key.
        '''
        raise NotImplementedError

    def get_current_user(self, handler):
        '''
        Called by a tornado.web.RequestHandler to get the username of the 
        authenticated user. Expected to return a string username or None if 
        not authenticated.
        '''
        raise NotImplementedError

    def check_credentials(self, handler, username, password):
        '''
        Called by a tornado.web.RequestHandler to authenticate a user by 
        checking the provided credentials against known usernames and 
        passwords. Expected to return True if the credentials are accepted or
        False if not.
        '''
        raise NotImplementedError
        
    def clear_credentials(self, handler):
        '''
        Called by a tornado.web.RequestHandler to clear authentication 
        credentials. No return value expected.
        '''
        raise NotImplementedError