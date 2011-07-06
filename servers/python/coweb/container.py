'''
Container for a coweb server.

Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
# std lib
import os
import sys
# coweb
import coweb
from coweb.auth.public import PublicAuth
from coweb.access.public import PublicAccess
from coweb.service.launcher.process import ProcessLauncher
from coweb.service.manager.bayeux import BayeuxServiceManager
from coweb.updater.default import DefaultUpdaterTypeMatcher

class AppContainer(object):
    '''
    Base class for an application container defining various options and 
    classes dictating the operation of the coweb server. Generate a subclass
    with full documentation using:
    
    pycoweb container my_start_script
    
    or with minimal info:
    
    pycoweb container my_simple_script -t simple
    '''
    webRoot = '/'
    def __init__(self, options):
        self.appSettings = {'debug' : options.debug}
        self.containerPath = os.path.abspath(os.path.dirname(sys.argv[0]))
        self.modulePath = os.path.abspath(os.path.dirname(coweb.__file__))
        self.httpPort = 8080 if options.port is None else options.port
        self.httpStaticPath = '../www'
        
        # default paths and coweb options
        self.webSecretKey = None
        self.webLoginUrl = self.webRoot + 'login'
        self.webLogoutUrl = self.webRoot + 'logout'
        self.webStaticRoot = self.webRoot + 'www/'
        self.webAdminUrl = self.webRoot + 'admin'
        self.webSessionRoot = self.webRoot + 'session/'
        self.cowebIdleTimeout = 30
        self.cowebBotLocalPaths = ['../bots']
        
        # default manager classes
        self.authClass = PublicAuth
        self.accessClass = PublicAccess
        self.serviceLauncherClass = (ProcessLauncher,
            {'sandboxUser' : 'nobody', 'botPaths' : self.cowebBotLocalPaths})
        self.serviceManagerClass = BayeuxServiceManager
        self.updaterTypeMatcherClass = DefaultUpdaterTypeMatcher
        
        # allow easy override of default settings without busting manager
        # creation
        self.on_configure()
        
        # adjust all paths to make them absolute relative to container loc now
        self.httpStaticPath = self.get_absolute_path(self.httpStaticPath)
        for i, path in enumerate(self.cowebBotLocalPaths):
            self.cowebBotLocalPaths[i] = self.get_absolute_path(path)

        # build global manager objects
        self.auth = self.on_build_auth_manager()
        self.access = self.on_build_access_manager()
        handlers = self.on_build_web_handlers()
        self.webApp = self.on_build_web_app(handlers, self.appSettings)
        self.updaterTypeMatcher = self.on_build_updater_type_matcher()
    
    def get_absolute_path(self, path):
        if not path.startswith('/'):
            return os.path.normpath(os.path.join(self.containerPath, path))
        return path
    
    def on_configure(self):
        pass

    def on_build_auth_manager(self):
        try:
            cls, kwargs = self.authClass
        except TypeError:    
            auth = self.authClass(self)
        else:
            auth = cls(self, **kwargs)
            
        if auth.requires_login():
            # set the login redirect url for handlers requiring auth
            self.appSettings['login_url'] = self.webLoginUrl
        if auth.requires_cookies():
            # set the secret key for secure cookies, gen one if needed
            if self.webSecretKey is None:
                import uuid
                self.webSecretKey = uuid.uuid4().hex
            self.appSettings['cookie_secret'] = self.webSecretKey
        return auth

    def on_build_access_manager(self):
        try:
            cls, kwargs = self.accessClass
        except TypeError:    
            access = self.accessClass(self)
        else:
            access = cls(self, **kwargs)
        return access

    def on_build_service_launcher(self, sessionBridge):
        try:
            cls, kwargs = self.serviceLauncherClass
        except TypeError:    
            launcher = self.serviceLauncherClass(self, sessionBridge)
        else:
            launcher = cls(self, sessionBridge, **kwargs)
        return launcher
        
    def on_build_service_manager(self, sessionBridge):
        try:
            cls, kwargs = self.serviceManagerClass
        except TypeError:    
            manager = self.serviceManagerClass(self, sessionBridge)
        else:
            manager = cls(self, sessionBridge, **kwargs)
        return manager        

    def on_build_web_handlers(self):
        from coweb.admin import AdminHandler
        handlers = [(self.webAdminUrl, AdminHandler)]

        # static file handlers if configured 
        if self.httpStaticPath is not None:
            from coweb.static import SecureStaticHandler
            from tornado.web import StaticFileHandler
            www = dict(path=self.httpStaticPath, default_filename='index.html')
            # insecure icon and robots file
            handlers.extend([
                (r'%s(.*)' % self.webStaticRoot, SecureStaticHandler, www),
                (r"/(favicon\.ico)", StaticFileHandler, www),
                (r"/(robots\.txt)", StaticFileHandler, www)
            ])

        # login and out endpoints
        if self.auth.requires_login():
            from coweb.login import LoginHandler
            from coweb.logout import LogoutHandler
            handlers.extend([
                (self.webLoginUrl, LoginHandler),
                (self.webLogoutUrl, LogoutHandler)
            ])

        # debug handler for server status dump
        if self.appSettings['debug']:
            from coweb.debug import DebugHandler
            handlers.append((r'/debug', DebugHandler))

        return handlers
        
    def on_build_web_app(self, handlers, settings):
        from coweb.application import Application
        return coweb.application.Application(self, handlers, **settings)

    def on_build_updater_type_matcher(self):
        try:
            cls, kwargs = self.updaterTypeMatcherClass
        except TypeError:
            updaterTypeMatcher = self.updaterTypeMatcherClass(self)
        else:
            updaterTypeMatcher = cls(self, **kwargs)
        return updaterTypeMatcher
