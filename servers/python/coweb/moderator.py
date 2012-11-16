
# TODO document

_moderators = {}

class CollabInterface:
    def __init__(self, mod, collabId):
        self._moderator = mod
        self._collabId = collabId
        self.serviceId = 0

    def subscribeService(self, svcName):
        # TODO
        pass

    # Send an application sync event to all collab clients.
    def sendSync(self, name, value, _type, pos):
        name = "coweb.sync." + name + "." + self._collabId
        self._moderator._session.publishModeratorSync(name, value, _type, pos)

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

    # Private, internal methods.
    def init(self, session):
        self._session = session

    def _endSession(self):
        # TODO remove collab interfaces
        self.onSessionEnd()

    def broadcast(self):
        self._session.broadcast()

    @staticmethod
    def getInstance(session, klass, key):
        moderator = _moderators.get(key, None)
        if moderator is not None:
            return moderator

        _moderators[key] = moderator = klass()
        moderator.init(session)
        return moderator

class DefaultSessionModerator(SessionModerator):
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

