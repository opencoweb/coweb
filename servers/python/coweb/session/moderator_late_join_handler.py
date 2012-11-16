
from .late_join_handler import LateJoinHandler
import logging

log = logging.getLogger('coweb.session')

class ModeratorLateJoinHandler(LateJoinHandler):

    def __init__(self, session):
        super(ModeratorLateJoinHandler, self).__init__(session)
        self._moderator = session._moderator

    # Returns true iff this is the first client in the session.
    def onClientJoin(self, client):
        '''Overrides to have the moderator immediatelty send late join state'''
        clientId = client.clientId

        try:
            # get site id already assigned
            siteid = self.getSiteForClient(client)
        except ValueError:
            # get new site id
            siteid = self.addSiteForClient(client)

        # get the roster list to return before adding anyone
        roster = self._getRosterList(client)

        data = []
        collabs = self._moderator.getLateJoinState()
        for key in collabs:
            data.append({
                "topic" : "coweb.state.set." + key,
                "value" : collabs[key]
            })

        data.append({
            "topic" : "coweb.engine.state",
            "value" : self._session._opengine.getEngineState()
        })

        client.add_message({
            'channel':'/service/session/join/siteid',
            'data': siteid
        })
        client.add_message({
            'channel':'/service/session/join/roster',
            'data': roster
        })
        client.add_message({
            'channel':'/service/session/join/state',
            'data': data
        })

        if 0 == self.getUpdaterCount():
            self.addUpdater(client, False)
            return True
        else:
            self.addUpdater(client, True)
            return False

