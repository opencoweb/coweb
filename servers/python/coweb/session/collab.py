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
from .. import OEHandler
from ..moderator import SessionModerator
from coweb.session.late_join_handler import LateJoinHandler
from coweb.session.moderator_late_join_handler import ModeratorLateJoinHandler

OEHandler = OEHandler.OEHandler
session_sync_regex = re.compile("/session/([A-z0-9]+)/sync(.*)");

log = logging.getLogger('coweb.session')

class CollabSession(session.Session):
    '''
    Manages a session instance that supports services and cooperative events.
    '''
    def __init__(self, *args, **kwargs):
        super(CollabSession, self).__init__(*args, **kwargs)
        self.collab = True
        self._connectionClass = CollabSessionConnection

        # operation total order
        self._opOrder = -1

        # TODO make this optional
        self._opengine = OEHandler(self, 0)

        # Moderator?
        self._moderator = SessionModerator.getInstance(
                self._container.moderatorClass, self.key)

        if self._container.moderatorIsUpdater:
            self._lateJoinHandler = ModeratorLateJoinHandler(self)
        else:
            self._lateJoinHandler = LateJoinHandler(self)

    def get_order(self):
        '''Gets the next operation order sequence number.'''
        self._opOrder += 1
        return self._opOrder

    def sync_for_service(self, client, req):
        '''
        Forwards sync events to service bridge if at least one service has 
        permission for sync events enabled.
        '''
        if self._services.needsSync:
            self._services.on_user_sync(client, req)

    def on_purging_client(self, cid, client):
        '''Override to remove updater and end a session when none left.'''
        # notify all bots of unsubscribing user
        self._services.on_user_unsubscribe_all(client)
        self._lateJoinHandler.removeUpdater(client)
        if self._lateJoinHandler.getUpdaterCount() == 0:
            # kill the session
            self.end_session()

    def onUpdaterSendState(self, updater, data):
        self._lateJoinHandler.onUpdaterSendState(updater, data)

class CollabSessionConnection(session.SessionConnection):
    '''Connection for collaborative sessions.'''
    def on_publish(self, cl, req, res):
        '''Override to handle updater and sync logic.'''
        channel = req['channel']
        if channel == '/service/session/updater':
            # handle updater response
            data = req.get('data', None)
            try:
                self._manager.onUpdaterSendState(cl, data) 
            except Exception:
                # bad updater, disconnect and assign a new one
                self._manager.remove_bad_client(cl)
                return
        else:
            matches = session_sync_regex.match(channel);
            if matches:
                # handle sync events
                try:
                    # put siteId on message
                    req['data']['siteId'] = cl.siteId
                    self._manager._lateJoinHandler.ensureUpdater(cl)
                except (KeyError, AttributeError):
                    # not allowed to publish syncs, disconnect
                    self._manager.remove_bad_client(cl)
                    return
                # last state no longer valid
                self._manager._lateJoinHandler.clearLastState()
                if '/app' == matches.group(2):
                    # App sync.
                    # Put total order sequence number on message
                    req['data']['order'] = self._manager.get_order()
                    # let manager deal with sync if forwarding it to services
                    self._manager.sync_for_service(cl, req)
                    if self._manager._opengine:
                        # Push sync to op engine.
                        self._manager._opengine.syncInbound(req['data'])
                elif '/engine' == matches.group(2):
                    # Engine sync.
                    if self._manager._opengine:
                        self._manager._opengine.engineSyncInbound(req['data'])
        # delegate all other handling to base class
        super(CollabSessionConnection, self).on_publish(cl, req, res)

    def on_subscribe(self, cl, req, res):
        '''Override to handle late-joiner logic.'''
        sub = req['subscription']
        didSub = True        
        if sub.startswith('/service/bot'):
            # handle private subscribe to bot
            didSub = self._manager.subscribe_to_service(cl, req, res, False)
        elif sub.startswith('/bot'):
            # public subscribe to bot
            didSub = self._manager.subscribe_to_service(cl, req, res, True)
        elif sub == '/service/session/join/*':
            ext = req['ext']
            coweb = ext['coweb']
            updaterType = coweb['updaterType']
            cl.updaterType = updaterType
            self._manager._lateJoinHandler.onClientJoin(cl) 
            didSub = True
        elif sub == '/service/session/updater':
            self._manager._lateJoinHandler.addUpdater(cl)
            didSub = True
        if didSub:
            # don't run default handling if sub failed
            super(CollabSessionConnection, self).on_subscribe(cl, req, res)

