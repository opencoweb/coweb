
from .late_join_handler import LateJoinHandler
import logging

log = logging.getLogger('coweb.session')

class ModeratorLateJoinHandler(LateJoinHandler):

    def __init__(self, session):
        super(ModeratorLateJoinHandler, self).__init__(session)
        self._moderator = session._moderator

    def queue_updatee(self, client):
        '''Overrides to have the moderator immediatelty send late join state'''
        clientId = client.clientId

        try:
            # get site id already assigned
            siteid = self.get_site_for_client(client)
        except ValueError:
            # get new site id
            siteid = self.add_site_for_client(client)

        # get the roster list to return before adding anyone
        roster = self._get_roster_list(client)

        data = self._moderator.getLateJoinState()

        # send site id to client
        client.add_message({
            'channel':'/service/session/join/siteid',
            'data': siteid
        })
        # send roster to client
        client.add_message({
            'channel':'/service/session/join/roster',
            'data': roster
        })
        # Send application data.
        client.add_message({
            'channel':'/service/session/join/state',
            'data': data
        })

        if len(self._updaters) == 0:
            self.add_updater(client, False)
        else:
            self.add_updater(client, True)

