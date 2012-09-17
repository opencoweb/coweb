"""
Exposing the operation engine as a standalone API (separate from OpenCoweb).

Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
"""

import json
from OperationEngine import OperationEngine

class OTEngine:
    """
    Creates an object that interfaces to an OperationEngine.
    
    The public API is as follows:
    
     - {JSON object} createOp(name, value, type, position)
       Applications must call this to create an opaque object that the
       OTEngine can understand. Specifically, calls to localEvent require
       as an argument an object returned from createOp.
    
     - {JSON object} localEvent(op):
       Local peers must call this when a local data structure has changed.
       The returned JSON object should be forwarded to remote peers
       unchanged.
    
     - {JSON object} remoteEvent(op, order):
       Local peers must call this to have the local engine process a remote
       peer's change. The JSON object passed to remoteEvent must be the
       exact JSON object returned by the remote peer's call to localEvent.
       Furthermore, remoteEvent takes a second integer argument that
       specifies the given operation's total order. Typically, some central
       server will decide the total order. The total order must be provided
       by the application of this OT API by some unspecified means.
    
     - {JSON object} syncOutbound(void):
       This should be called periodically by the application to retrieve
       local internal engine state (context vector). The returned object
       must be forwarded to all other remote peers. The suggested interval
       for calling this method is every ten seconds.
    
     - void syncInbound(site, state):
       Applications should call this method when they receive a remote
       peer's internal engine state (the context vector returned from the
       remote peer's syncOutbound call).
    
     - boolean purge(void):
       Applications should call this to purge internal engine state. The
       engine's history buffer is garbage collected. Returns whether or not
       the engine was purged.
    
     - boolean isStable(void):
       Returns whether or not the OTEngine is in a "valid" state. This means
       whether or not calls to localEvent, etc will continue to succeed.
       If the engine is not in a valid state, then calling localEvent, etc
       will be a noop. An invalid state means that the local data can no
       longer guaranteed to be in sync with that of remote peers.
    
       TODO provide API examples
    
    """
    def __init__(self, id):
        self._engine = OperationEngine(id)
        self._engine.freezeSite(id)
        self._engineStable = True

    """
    Call this periodically to retrieve the local engine's context vector
    to send to remote peers.
    
    @return context vector to send to the server, or false on error
    """
    def syncOutbound(self):
        if (not self._engineStable):
            return False
        return self._engine.copyContextVector().sites

    """
    Call this to apply engine syncs from a remote peer. The remote peer will
    have called OTEngine.syncOutbound() to retrieve the engine's context
    vector.
    
    @param site from site
    @param sites remote sites context vector
    @return whether or not local engine was synced
    """
    def syncInbound(self, site, sites):
        """ Ignore our own engine syncs. """
        if (site == self._engine.siteId):
            return False
        try:
            self._engine.pushSyncWithSites(site, sites)
        except Exception as e:
            print "OTEngine: failed to receive engine sync", site, sites, str(e)
            return False
        return True

    """
    Attempts to purge the OT engine.
    
    @return whether or not the engine was purged
    """
    def purge(self):
        if (not self._engineStable):
            return False
        try:
            self._engine.purge()
        except Exception as e:
            print "OTEngine: failed to purge engine " + str(e)
            return False
        return True

    """
    Returns whether or not this engine is in a "valid" state.
    """
    def isStable(self):
        return self._engineStable

    """
    Create an object that can be used with OTEngine.sendOp(). All four
    arguments must be specified.
    
    type must be one of insert, update, or delete.
    position must be >= 0
    
    @param name
    @param value
    @param type
    @param position
    @return object that can be passed to OTEngine.sendOp()
    """
    def createOp(self, name, value, _type, position):
        return {
            "name": name,
            "value": value,
            "type": _type,
            "position": position
        }

    """
    Call this after the local document has applied a local operation. The
    operation is applied to the local engine. This function will then return
    a JSON object that can be passed to remote peer's OTEngine.remoteEvent.
    
    @param localOp
    @return JSON encodable object to send to remote sites, or false on error.
    """
    """ TODO does null type even make sense? """
    def localEvent(self, localOp):
        if (not self._engineStable):
            return False

        """ unpack event data; be sure to json encode the value before pushing
            into op engine to avoid ref sharing with the operation history """
        position = localOp["position"]
        name = localOp["name"]
        _type = localOp["type"]
        value = json.dumps(localOp["value"])
        op = None
        sites = None

        if (_type != None):
            """ build operation """
            try:
                op = self._engine.createOp(True, name, value, _type, position)
                sites = op.contextVector.sites
            except Exception:
                print 'OTEngine::localEvent: bad type "' + _type + \
                    '" on outgoing event. OperationEngine unchanged.'
                return False

        """ add local event to engine, but only if it was really sent
            yes, the local state changed, but it's better to keep the
            context vector in the engine consistent than to track an
           event we never sent """
        self._engine.pushLocalOp(op)
        """ we have to allow purges after sending even one event in """
        """ case this site is the only one in the session for now """
        self._shouldPurge = True

        """ Construct and return the JSON object that client will send to remote
            server. """
        return {
            "name" : name,
            "value": value,
            "type": _type,
            "position": position,
            "site": self._engine.siteId,
            "sites": sites,
        }

    """
    Call this when a remote site wants to synchronize an operation. The
    scenario is that a remote site ferries an operation to this local site,
    then this local site must transform the operation to one that can be
    applied locally (maintaining consistency).
    
    @param remoteOp remote operation to be transformed
    @param order Total order seen by all collaborators.
    @return transformed event that can safely be applied to the local
            document
    """
    def remoteEvent(self, order, remoteOp):
        return self._syncRemote(remoteOp["name"], remoteOp["value"],
                remoteOp["type"], remoteOp["position"], remoteOp["site"],
                remoteOp["sites"], order)

    """
    Called by the session when a coweb event is received from a remote app.
    Processes the data in the local operation engine if required before
    publishing it on the local Hub.
    
    @throws Error if the engine is unable to process the remote event
    
    @param name Collab object name
    @param value JSON-encoded operation value
    @param type Operation type
    @param position Operation linear position
    @param site Unique integer ID of the sending site
    @param sites Context vector as an array of integers
    @param order Total order seen by all collaborators.
    @return JSON object with information about how to apply the change to
            local data structures. false is returned on any error
    """
    def _syncRemote(self, name, value, _type, position, site, sites, order):
        if (not self._engineStable):
            return False

        """ check if the event has a context and non-null type """
        if (sites and _type):
            """ treat event as a possibly conflicting operation """
            try:
                op = self._engine.push(False, name, value, _type, position,
                    site, sites, order)
            except IOError as e:
                print "name", name
                print "value", value
                print "type", _type
                print "position", position
                print "OTEngine: failed to push op into engine " + str(e)
                self._engineStable = False
                raise e
            """ Discard null operations; they should not be sent to app
                according to op engine """
            if(op == None):
                return
            """ use newly computed value and position. """
            value = op.value
            position = op.position
        elif (site == self._engine.siteId):
            """ op was echoed from server for op engine, but type null means
                op engine doesn't care about this message anyway so drop it. """
            return

        if (op):
            """ We've gotten an operation from elsewhere, so we should sync
                and/or purge the engine on the next interval. """
            self._shouldPurge = True
            self._shouldSync = True
        return {
            "position" : position,
            "type" : _type,
            "value" : json.loads(value),
            "site" : site
        }


