'''
Debug web view.

Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
# tornado
import tornado.web
# std lib
import pprint
import cStringIO
import datetime

class DebugHandler(tornado.web.RequestHandler):
    '''Snapshot of internal session state for debugging info.'''
    def get(self):
        self.set_header('Content-Type', 'text/html')
        args = self.request.arguments
        dt = datetime.datetime.now()
        
        # dump the application settings
        sessionIds = cStringIO.StringIO()
        pprint.pprint(self.application.sessionIds, stream=sessionIds)
        
        # dump details of individual sessions
        details = {}
        for key, session in self.application.sessions.items():
            details[key] = {
                'clients' : session._clients,
                'activeBots' : session.services.activeBots
            }  
            if session.collab:
                details[key].update({
                    'updaters' : session.updaters,
                    'updatees' : session.updatees,
                    'siteids' : session.siteids
                })
        sessions = cStringIO.StringIO()
        pprint.pprint(details, stream=sessions)
        
        # do refresh if requested
        refresh = args.get('refresh', [None])[0]
        
        self.render('templates/debug.html', 
            sessionIds=sessionIds.getvalue(), 
            sessions=sessions.getvalue(),
            dt=str(dt),
            refresh=refresh
        )