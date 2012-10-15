
_moderators = {}

# Adopted from hasen j's answer to
# http://stackoverflow.com/questions/452969/does-python-have-an-equivalent-to-java-class-forname
def _get_class( kls ):
    try:
        parts = kls.split('.')
        module = ".".join(parts[:-1])
        m = __import__( module )
        for comp in parts[1:]:
            m = getattr(m, comp)            
        return m
    except Exception:
        return None

def get_instance(class_name, key):
    moderator = _moderators.get(key, None)
    if moderator is not None:
        return moderator

    # Must create a new moderator for the given cowebkey.
    if not class_name:
        class_name = 'coweb.session_moderator.session_moderator'

    clss = _get_class(class_name)
    if clss is None:
        clss = session_moderator

    moderator = clss(key)
    _moderators[key] = moderator
    return moderator

class session_moderator:

    def __init__(self, key):
        self.key = key

    def canClientJoinState(self, client):
        pass

    def canClientMakeServiceRequest(self, client):
        pass

    def canClientSubscribeService(self, client):
        pass

    def getLateJoinState(self):
        pass

    def getLocalSession(self):
        pass

    def getServerSession(self):
        pass

    def onClientJoinSession(self, client):
        pass

    def onClientLeaveSession(self, client):
        pass

    def onServiceResponse(self, botResponse):
        pass

    def onSessionEnd(self):
        pass

    def onSync(self, data):
        pass

    def setSessionAttribute(self, key, value):
        pass

