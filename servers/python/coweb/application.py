'''
Application managing Tornado handlers.

Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
# tornado
import tornado.httpserver
import tornado.ioloop
import tornado.web
# std lib
import logging

log = logging.getLogger('coweb.app')

class Application(tornado.web.Application):
    def __init__(self, container, *args, **kwargs):
        super(Application, self).__init__(*args, **kwargs)
        self._container = container
        self._sessions = {}
        self._sessionIds = {}

    def get_container(self):
        '''Gets the container managing this application.'''
        return self._container

    def add_session_handler(self, session, handler):
        '''Registers the handler for a session.'''
        # pattern pulls out sessionId for us on request
        pattern = '%s(%s)/?.*' % (self._container.webSessionRoot, session.sessionId)
        # add session handler for all hosts
        self.extend_handlers(r'.*$', [(pattern, handler)])
        self._sessionIds[(session.key, session.collab)] = session.sessionId
        self._sessions[session.sessionId] = session

    def get_session_id(self, key, collab):
        '''Gets a session ID from the key and collab flag.'''
        return self._sessionIds[(key, collab)]
        
    def get_session_url(self, sessionId):
        '''Gets a session URL from a session ID.'''
        return self._container.webSessionRoot + sessionId
        
    def get_session_obj(self, sessionId):
        '''Gets a session object from a session ID.'''
        return self._sessions[sessionId]
        
    def remove_session_handler(self, session):
        '''Removes the handler for a session.'''
        try:
            del self._sessionIds[(session.key, session.collab)]
        except KeyError:
            return
        del self._sessions[session.sessionId]
        pattern = '%s(%s)/?.*' % (self._container.webSessionRoot, session.sessionId)
        self.remove_handler(r'.*$', pattern)
    
    def extend_handlers(self, host_pattern, host_handlers, after=True):
        '''Adds to the handler list after app start.'''
        handlers = None
        for regex, h in self.handlers:
            if regex.pattern == host_pattern:
                handlers = h
                break
        if handlers is None:
            raise ValueError('cannot extend handlers for unknown host')
        for spec in host_handlers:
            if type(spec) is type(()):
                assert len(spec) in (2, 3)
                pattern = spec[0]
                handler = spec[1]
                if len(spec) == 3:
                    kwargs = spec[2]
                else:
                    kwargs = {}
                spec = tornado.web.URLSpec(pattern, handler, kwargs)
            if after:
                handlers.append(spec)
            else:
                handlers.insert(0, spec)

    def remove_handler(self, host_pattern, url_pattern):
        '''Removes from the handler list after app start.'''
        handlers = None
        for regex, h in self.handlers:
            if regex.pattern == host_pattern:
                handlers = h
                break
        if handlers is None:
            raise ValueError('cannot remove handler for unknown host')
        i = 0
        if not url_pattern.endswith('$'):
            url_pattern += '$'
        while i < len(handlers):
            handler = handlers[i]
            if handler.regex.pattern == url_pattern:
                handlers.pop(i)
            else:
                i += 1