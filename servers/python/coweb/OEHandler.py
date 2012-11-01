
from cowebpyoe.ContextVector import ContextVector
from cowebpyoe.Operation import Operation
from cowebpyoe.OperationEngine import OperationEngine
from cowebpyoe.OperationEngineException import OperationEngineException

import traceback
from tornado.escape import json_encode, json_decode
from multiprocessing import Process
import time

PURGE_SLEEP = 10
SYNC_SLEEP = 10

class OEHandler:

    def __init__(self, sessionHandler, siteId):
        self.sessionHandler = sessionHandler
        self.engine = OperationEngine(siteId)
        self.engine.freezeSite(0)

        self.shouldSync = False
        self.shoudPurge = False

        self.purgeTask = Process(target=self._purgeTask)
        self.syncTask = Process(target=self._syncTask)

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
                (use {@link OperationEngineHandler#getSites} to convert from Integer[] to int[])
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
                "value" : json_encode(value),
                "site" : site,
                "channel" : topic
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
        except OperationEngineException, e:
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
      " Called whenever the SessionHandler that owns this OperationEngineHandler is ending. All
      " TimerTasks are stopped from repeating.
      "
      " Only package level access.
    """
    def shutdown(self):
        self.purgeTask.terminate()
        self.syncTask.terminate()

    def _purgeTask(self):
        while 1:
            self.doPurge()
            time.sleep(PURGE_SLEEP)

    def _syncTask(self):
        while 1:
            self.doSync()
            time.sleep(SYNC_SLEEP)

    """
     " Called on a timer to purge the local op engine history buffer if the
     " op engine received a remote event or context vector since the last time
     " the timer fired.
    """
    def doPurge(self):
        if (not self.shouldPurge) or self.engine is None:
            return
        try:
            engine.purge()
        except Exception:
            traceback.print_exc()
        self.shouldPurge = False

    """
       Called on a timer to send the local op engine context vector to other
       participants (topics.ENGINE_SYNC) if the local op engine processed
       received events since since the last time the timer fired.
    """
    def doSync(self):
        if (not self.shouldSync) or self.engine is None:
            return
        try:
            cv = self.engine.copyContextVector()
            sessionHandler.postEngineSync(cv.getSites())
        except OperationEngineException:
            traceback.print_exc()
        self.shouldSync = False

