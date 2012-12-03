'''
Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
# tornado
import tornado.httpserver
import tornado.ioloop
import tornado.web
from tornado.escape import json_encode, json_decode
# std lib
import logging
import re
# coweb
from . import session
from coweb.session.late_join_handler import LateJoinHandler
from coweb.session.moderator_late_join_handler import ModeratorLateJoinHandler

getServiceNameFromChannel = session.getServiceNameFromChannel
log = logging.getLogger('coweb.session')

class CollabSession(session.Session):
    '''
    Manages a session instance that supports services and cooperative events.
    '''
    def __init__(self, *args, **kwargs):
        super(CollabSession, self).__init__(*args, **kwargs)
        self.collab = True
        self._connectionClass = CollabSessionConnection

        if self._container.moderatorIsUpdater:
            self._lateJoinHandler = ModeratorLateJoinHandler(self)
        else:
            self._lateJoinHandler = LateJoinHandler(self)

    def get_order(self):
        '''Gets the next operation order sequence number.'''
        self._opOrder += 1
        return self._opOrder

    def on_purging_client(self, cid, client):
        '''Override to remove updater and end a session when none left.'''
        self._lateJoinHandler.removeUpdater(client)
        self._moderator.onClientLeaveSession(client)
        super(CollabSession, self).on_purging_client(cid, client)

    def onUpdaterSendState(self, updater, data):
        self._lateJoinHandler.onUpdaterSendState(updater, data)

class CollabSessionConnection(session.SessionConnection):
    '''Connection for collaborative sessions.'''
    def on_publish(self, cl, req, res):
        '''Override to handle updater and sync logic.'''
        manager = self._manager
        channel = req['channel']
        if channel == '/service/session/updater':
            # handle updater response
            data = req.get('data', None)
            try:
                manager.onUpdaterSendState(cl, data) 
            except Exception:
                # bad updater, disconnect and assign a new one
                manager.remove_bad_client(cl)
                return
        elif channel == manager.syncAppChannel:
            manager._lateJoinHandler.clearLastState()
            req['data']['siteId'] = cl.siteId
            req['data']['order'] = manager.get_order()
            # Push sync to op engine.
            sync = manager._opengine.syncInbound(req['data'])
            if sync:
                manager._inOnSync = True
                manager._moderator.onSync(cl, sync)
                manager._inOnSync = False
        elif channel == manager.syncEngineChannel:
            manager._opengine.engineSyncInbound(req['data'])
        # delegate all other handling to base class
        super(CollabSessionConnection, self).on_publish(cl, req, res)
        manager._flushModSyncs()

    def on_subscribe(self, cl, req, res):
        '''Override to handle late-joiner logic.'''
        manager = self._manager
        sub = req['subscription']
        didSub = True
        pub = sub.startswith('/bot')
        if pub or sub.startswith('/service/bot'):
            # public subscribe to bot (/bot)
            # handle private subscribe to bot (/service/bot)
            svcName = getServiceNameFromChannel(sub, pub)
            if manager._moderator.canClientSubscribeService(svcName, cl, req):
                didSub = manager.subscribe_to_service(cl, req, res, pub)
        elif sub == '/service/session/join/*':
            if manager._moderator.canClientJoinSession(cl, req):
                ext = req['ext']
                coweb = ext['coweb']
                updaterType = coweb['updaterType']
                cl.updaterType = updaterType
                if manager._lateJoinHandler.onClientJoin(cl):
                    manager._moderator.onSessionReady()
        elif sub == '/service/session/updater':
            manager._lateJoinHandler.addUpdater(cl)
            manager._moderator.onClientJoinSession(cl, req)
        if didSub:
            # don't run default handling if sub failed
            super(CollabSessionConnection, self).on_subscribe(cl, req, res)

