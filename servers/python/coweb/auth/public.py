'''
Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
from base import AuthBase

class PublicAuth(AuthBase):
    cookieName = 'coweb.auth.public.username'
    _userId = 0
    def requires_login(self):
        '''Does not require login. Usernames automatically generated.'''
        return False
        
    def requires_cookies(self):
        '''Uses tornado's secure cookies.'''
        return True

    def get_current_user(self, handler):
        '''
        Generates a unique userXXX for this server instance and stores it in a
        secure cookie.
        '''
        username = handler.get_secure_cookie(self.cookieName)
        if not username:
            # generate a random username and set it with a very short lifetime
            username = 'user%03d' % self._userId
            # yes, this might conflict between server restarts but it's dummy
            # public auth
            self._userId += 1
            handler.set_secure_cookie(self.cookieName, username, expires_days=1)
        return username
        
    def clear_credentials(self, handler):
        '''Clears the authentication cookie.'''
        handler.clear_cookie(self.cookieName)