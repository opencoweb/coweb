
from .serviceutil import getServiceNameFromChannel
from .serviceutil import isServiceChannel
from .serviceutil import isPublicBroadcast
from .bayeux.handler import InternalBayeuxHandler

_moderators = {}

"""
The moderator is logically another particpating client in a session. It should
be able to do anything a browser client can. Much functionality (e.g. sending a
sync or subscribing to bot) is implemented in a very ad-hoc manner.

Ultimately, I'd like to have the moderator have full bayeux communication
capabilities. See how the bots are implemented: they are started as another OS
process and actually communicate over WebSockets. For now, the ad-hoc
implementation works, so we'll stick with it.
"""

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
        self.serviceId += 1
        topic = "coweb.service.request." + service + "_" +\
                str(self.serviceId) + "." + self._collabId
        self._moderator._session.postModeratorService(service, topic, params)

class SessionModerator:
    def __init__(self):
        pass

    # The following define the public callback API.
    def canClientJoinSession(self, clientId, userDefined):
        raise NotImplementedError()
    def canClientMakeServiceRequest(self, svcName, clientId, botData):
        raise NotImplementedError()
    def getLateJoinState(self):
        raise NotImplementedError()
    def canClientSubscribeService(self, svcName, clientId):
        raise NotImplementedError()
    def onClientJoinSession(self, clientId):
        raise NotImplementedError()
    def onClientLeaveSession(self, clientId):
        raise NotImplementedError()
    def onServiceResponse(self, svcName, data, error, isPublic):
        raise NotImplementedError()
    def onSessionEnd(self):
        raise NotImplementedError()
    def onSessionReady(self):
        raise NotImplementedError()
    def onSync(self, clientId, data):
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
        self._connCounter = 0
        self._session = session
        self._collabInterfaces = set()
        self.client = session.new_client()
        self.client.username = "Moderator"
        self._doConnect()

    def _doConnect(self):
        self.clientConn = InternalBayeuxHandler(self)
        self._connCounter += 1
        req = {
                "clientId": self.client.clientId,
                "connectionType": "long-polling",
                "channel": "/meta/connect",
                "id": self._connCounter}
        res = {
                "successful": True,
                "channel": "/meta/connect",
                "advice": {"timeout": 15000},
                "id": self._connCounter}
        self.client.on_connect(self.clientConn, req, res)

    def onMessage(self, data):
        ch = data.get("channel", "")
        if isServiceChannel(ch):
            data = data["data"]
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

    def canClientJoinSession(self, clientId, userDefined):
        return True
    def canClientMakeServiceRequest(self, svcName, clientId, botData):
        return True
    def getLateJoinState(self):
        return {}
    def canClientSubscribeService(self, svcName, clientId):
        return True
    def onClientJoinSession(self, clientId):
        pass
    def onClientLeaveSession(self, clientId):
        pass
    def onServiceResponse(self, svcName, data, error, isPublic):
        pass
    def onSessionEnd(self):
        pass
    def onSessionReady(self):
        pass
    def onSync(self, clientId, data):
        pass

