

# TODO document

_moderators = {}

class SessionModerator:
    def __init__(self):
        print("hello from moderator")
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

    def _endSession(self):
        # TODO remove collab interfaces
        self.onSessionEnd()

    @staticmethod
    def getInstance(klass, key):
        moderator = _moderators.get(key, None)
        if moderator is not None:
            return moderator

        _moderators[key] = moderator = klass()
        return moderator

class DefaultSessionModerator(SessionModerator):
    def canClientJoinSession(self, client, message):
        return True
    def canClientMakeServiceRequest(self, svcName, client, botMessage):
        return True
    def getLateJoinState(self):
        print("in late get state")
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

