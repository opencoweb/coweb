
from .serviceutil import getServiceNameFromChannel
from .serviceutil import isServiceChannel
from .serviceutil import isPublicBroadcast
from .bayeux.handler import InternalBayeuxHandler

_moderators = {}

class CollabInterface:
    def __init__(self, mod, collabId):
        self._moderator = mod
        self._collabId = collabId
        self.serviceId = 0

    def subscribeService(self, svcName):
        self._moderator._session.subscribeModeratorToService(svcName)

    # Send an application sync event to all collab clients.
    def sendSync(self, name, value, _type, position):
        name = "coweb.sync." + name + "." + self._collabId
        self._moderator._session.publishModeratorSync(name, value, _type,
                position)

    # Send a message to a service bot.
    def postService(self, service, params):
        # TODO
        pass

class SessionModerator:
    def __init__(self):
        pass

    # The following define the public callback API.
    def canClientJoinSession(self, client, message):
        raise NotImplementedError()
    def canClientMakeServiceRequest(self, svcName, client, botMessage):
        raise NotImplementedError()
    def getLateJoinState(self):
        raise NotImplementedError()
    def canClientSubscribeService(self, svcName, client, message):
        raise NotImplementedError()
    def onClientJoinSession(self, client, message):
        raise NotImplementedError()
    def onClientLeaveSession(self, client):
        raise NotImplementedError()
    def onServiceResponse(self, svcName, data, error, isPublic):
        raise NotImplementedError()
    def onSessionEnd(self):
        raise NotImplementedError()
    def onSessionReady(self):
        raise NotImplementedError()
    def onSync(self, client, data):
        raise NotImplementedError()

    # Create a CollabInterface for a moderator. Called by application
    # developers.
    def initCollab(self, collabId):
        ci = CollabInterface(self, collabId)
        self._collabInterfaces.add(ci)
        return ci

    # Private, internal methods.

    # Create a bayeux client to represent this moderator. This way, the
    # moderator can send/receive messages like a "normal" browser client.
    def init(self, session):
        self._session = session
        self._collabInterfaces = set()
        self.client = session.new_client()
        self.clientConn = InternalBayeuxHandler(self)
        req = {
                "clientId": self.client.clientId,
                "connectionType": "callback", # Non standard.
                "channel": "/meta/connect"}
        self.client.on_connect(self.clientConn, req, None)
        self.client.username = "Moderator"

    def onMessage(self, data):
        ch = data.get("channel", "")
        if isServiceChannel(ch):
            isPub = isPublicBroadcast(ch)
            svcName = getServiceNameFromChannel(ch, isPub)
            error = data.get("error", False)
            data = data.get("value")
            self.onServiceResponse(svcName, data, error, isPub)

    def _endSession(self):
        for ci in self._collabInterfaces:
            pass
        self._collabInterfaces.clear()
        self._session = None
        self.onSessionEnd()

    @staticmethod
    def getInstance(session, klass, key):
        moderator = _moderators.get(key, None)
        if moderator is None:
            _moderators[key] = moderator = klass()
        moderator.init(session)
        return moderator

class DefaultSessionModerator(SessionModerator):
    def __init__(self):
        super(DefaultSessionModerator, self).__init__()

    def canClientJoinSession(self, client, message):
        return True
    def canClientMakeServiceRequest(self, svcName, client, botMessage):
        return True
    def getLateJoinState(self):
        return {}
    def canClientSubscribeService(self, svcName, client, message):
        return True
    def onClientJoinSession(self, client, message):
        pass
    def onClientLeaveSession(self, client):
        pass
    def onServiceResponse(self, svcName, data, error, isPublic):
        pass
    def onSessionEnd(self):
        pass
    def onSessionReady(self):
        pass
    def onSync(self, client, data):
        pass

