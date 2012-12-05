
import traceback
import json
import tornado.ioloop
import time
import logging

from coweb.cowebpyoe.ContextVector import ContextVector
from coweb.cowebpyoe.Operation import Operation
from coweb.cowebpyoe.OperationEngine import OperationEngine
from coweb.cowebpyoe.OperationEngineException import OperationEngineException

log = logging.getLogger("coweb.OEHandler")

PURGE_SLEEP = 10
SYNC_SLEEP = 10

class OEHandler:

    def __init__(self, sessionHandler, siteId):
        self._ioLoop = tornado.ioloop.IOLoop.instance()
        self.sessionHandler = sessionHandler
        self.engine = OperationEngine(siteId)
        self.engine.freezeSite(0)

        self.shouldSync = False
        self.shouldPurge = False

        self.purgeTask = self._ioLoop.add_timeout(
                time.time() + PURGE_SLEEP, self._doPurge)
        self.syncTask = self._ioLoop.add_timeout(
                time.time() + SYNC_SLEEP, self._doSync)

    """
        Called by the session when the moderator (or in general, any local
        client) wants to send a sync event.
    """
    def localSync(self, topic, value, _type, position):
        jsonVal = json.dumps(value)
        cv = None
        op = None
        if _type is not None:
            try:
                op = self.engine.createOp(True, topic, jsonVal, _type, position,
                        -1, None, -1)
                cv = op.contextVector
            except OperationEngineException:
                log.warn("Bad type: %s, using None type instead." % _type)
                _type = None

        message = dict()
        message["topic"] = topic
        message["value"] = jsonVal
        message["type"] = _type
        message["position"] = position
        if cv is not None:
            message["context"] = cv.sites
        else:
            message["context"] = None

        self.sessionHandler.sendModeratorSync(message)

        if _type is not None:
            self.engine.pushLocalOp(op)

    """
       Called by the session when a coweb event is received from a remote app.
       Processes the data in the local operation engine if required before
       publishing to the moderator.

       @param data Map containing the following.
              <li>String topic Topic name (topics.SYNC.**)
              <li>String value JSON-encoded operation value
              <li>String|null type Operation type
              <li>Integer position Operation linear position
              <li>Integer site Unique integer ID of the sending site
              <li>Integer[] sites Context vector as an array of integers 
                (use {@link OperationEngineHandler#getSites} to convert from 
                Integer[] to int[])
    """
    def syncInbound(self, data):

        topic = data.get("topic", "")
        value = data.get("value", None)
        _type = data.get("type", "")
        position = data.get("position", 0)
        site = data.get("siteId", 0)
        order = data.get("order", 0)

        sites = self.getSites(data)

        # push the operation onto the op engine.
        op = None
        if sites != None and _type != None:
            try:
                op = self.engine.push(False, topic, value, _type, position,\
                        site, sites, order)
            except OperationEngineException:
                traceback.print_exc()
                return None

            if op is None:
                return None

            value = op.value
            position = op.position
        elif site == self.engine.siteId:
            # op was echo'ed from server for op engine, but type null means
            # op engine doesn't care about this message anyway so drop it
            return None

        self.shouldPurge = True
        self.shouldSync = True

        # value is always json-encoded to avoid ref sharing problems with ops
        # stored inside the op engine history buffer, so decode it and
        # pack it into a hub event
        return {
                "position" : position,
                "type" : _type,
                "value" : json.loads(value),
                "site" : site,
                "topic" : topic
                }

    """
       Called when the listener receives a context vector from a remote op
       engine (topics.ENGINE_SYNC). Integrates the context vector into context
       vector table of the local engine. Sets a flag saying the local op engine
       should run garbage collection over its history.

       @param data Map containing the following.
              <li>Integer site Unique integer ID of the sending site
              <li>int[] sites Context vector as an array of integers
    """
    def engineSyncInbound(self, data):

        sites = self.getSites(data)
        site = data.get("siteId", -1)

        # ignore our own engine syncs
        if site == self.engine.siteId:
            return

        # give the engine the data
        try:
            self.engine.pushSyncWithSites(site, sites)
        except OperationEngineException as e:
            log.info("UnmanagedHubListener: failed to recv engine sync " +\
                    site + " " + sites + " " + e.getMessage())
        # we've received remote info, allow purge
        self.shouldPurge = True

    def getSites(self, data):
        ctx = data.get("context", None)
        if ctx is not None:
            return ctx[:]
        return None

    """
        Wrapper for access to {@link org.coweb.oe.OperationEngine#getState}.
       
        @return engine state
    """
    def getEngineState(self):
        return self.engine.getState()

    """
      " Called whenever the SessionHandler that owns this OperationEngineHandler
      " is ending. All TimerTasks are stopped from repeating.
      "
      " Only package level access.
    """
    def shutdown(self):
        self._ioLoop.remove_timeout(self.purgeTask)
        self._ioLoop.remove_timeout(self.syncTask)

    """
     " Called on a timer to purge the local op engine history buffer if the
     " op engine received a remote event or context vector since the last time
     " the timer fired.
    """
    def _doPurge(self):
        if self.shouldPurge and self.engine is not None:
            try:
                self.engine.purge()
            except Exception:
                traceback.print_exc()
            self.shouldPurge = False
        self.purgeTask = self._ioLoop.add_timeout(
                time.time() + PURGE_SLEEP, self._doPurge)

    """
       Called on a timer to send the local op engine context vector to other
       participants (topics.ENGINE_SYNC) if the local op engine processed
       received events since since the last time the timer fired.
    """
    def _doSync(self):
        if self.shouldSync and self.engine is not None:
            try:
                cv = self.engine.copyContextVector()
                self.sessionHandler.postEngineSync(cv.sites)
            except OperationEngineException:
                traceback.print_exc()
            self.shouldSync = False
        self.syncTask = self._ioLoop.add_timeout(
                time.time() + SYNC_SLEEP, self._doSync)

