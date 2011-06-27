'''
Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
# std lib
import ConfigParser
# tornado
import tornado.web
from base import AuthBase

class IniAuth(AuthBase):
    cookieName = 'coweb.auth.ini.username'
    def __init__(self, container, iniPath='users.ini'):
        super(IniAuth, self).__init__(container)
        # compute abs path to ini file
        self._iniPath = self._container.get_absolute_path(iniPath)
    
    def requires_login(self):
        '''Requires user login.'''
        return True
        
    def requires_cookies(self):
        '''Uses tornado's secure cookies'.'''
        return True

    def get_current_user(self, handler):
        '''Gets the current username from the secure cookie.'''
        return handler.get_secure_cookie(self.cookieName)

    def check_credentials(self, handler, username, password):
        '''Checks the login credentials against a simple INI file.'''
        # @todo: put this on a timer or something; wasteful to do each time
        users = ConfigParser.ConfigParser()
        users.optionxform = str
        users.read(self._iniPath)

        try:
            pw = users.get('md5', username)
        except (ConfigParser.NoOptionError, ConfigParser.NoSectionError):
            pass
        else:
            known = (pw == password)

        try:
            pw = users.get('plain', username)
        except (ConfigParser.NoOptionError, ConfigParser.NoSectionError):
            known = False
        else:
            known = (pw == password)
        
        if known:
            handler.set_secure_cookie(self.cookieName, username)
        else:
            raise tornado.web.HTTPError(403)

    def clear_credentials(self, handler):
        '''Clears the authentication cookie.'''
        handler.clear_cookie(self.cookieName)