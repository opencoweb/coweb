'''
Simple, form-based login.

Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
# tornado
import tornado.web
# std lib
import json

# @todo: need an async one for oauth that can do redirect and back?
class LoginHandler(tornado.web.RequestHandler):
    '''Shows a login form or redirects to the last page on login.'''
    def prepare(self):
        self._container = self.application.get_container()

    def get_current_user(self):
        return self._container.auth.get_current_user(self)

    def get(self):
        args = self.request.arguments
        if self.current_user:
            next = args.get('next', ['/'])
            self.redirect(next[0])
        else:
            self.render('templates/login.html')

    def post(self):
        args = json.loads(self.request.body)
        username = args.get('username')
        password = args.get('password')
        self._container.auth.check_credentials(self, username, password)