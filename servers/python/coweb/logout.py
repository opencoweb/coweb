'''
Logout handler.

Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
# tornado
import tornado.web
from tornado.escape import json_encode, json_decode

class LogoutHandler(tornado.web.RequestHandler):
    '''Cleans up any persistent auth tokens.'''
    def prepare(self):
        self._container = self.application.get_container()

    def get(self):
        self._container.auth.clear_credentials(self)