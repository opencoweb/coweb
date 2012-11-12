

# TODO document

_moderators = {}

class SessionModerator:
    def __init__(self):
        print("hello from moderator")
    def canClientJoinSession(self):
        raise NotImplementedError()
    def canClientMakeServiceRequest(self):
        raise NotImplementedError()
    def canClientSubscribeService(self):
        raise NotImplementedError()
    def onClientJoinSession(self):
        raise NotImplementedError()
    def onClientLeaveSession(self):
        raise NotImplementedError()
    def onServiceResponse(self):
        raise NotImplementedError()
    def onSessionEnd(self):
        raise NotImplementedError()
    def onSessionReady(self):
        raise NotImplementedError()
    def onSync(self):
        raise NotImplementedError()
    def getLateJoinState(self):
        raise NotImplementedError()

    @staticmethod
    def getInstance(klass, key):
        moderator = _moderators.get(key, None)
        if moderator is not None:
            return moderator

        _moderators[key] = moderator = klass()
        return moderator

class DefaultSessionModerator(SessionModerator):
    def canClientJoinSession(self):
        return True
    def canClientMakeServiceRequest(self):
        return True
    def canClientSubscribeService(self):
        return True
    def onClientJoinSession(self):
        pass
    def onClientLeaveSession(self):
        pass
    def onServiceResponse(self):
        pass
    def onSessionEnd(self):
        pass
    def onSessionReady(self):
        pass
    def onSync(self):
        pass
    def getLateJoinState(self):
        print("in late get state")
        return {}

