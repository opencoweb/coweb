'''
Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
# tornado
import tornado.web

class SecureStaticHandler(tornado.web.StaticFileHandler):
    '''Subclass of static file handling to require auth.'''
    def get_current_user(self):
        container = self.application.get_container()
        return container.auth.get_current_user(self)

    @tornado.web.authenticated
    def get(self, *args, **kwargs):
        return super(SecureStaticHandler, self).get(*args, **kwargs)