'''
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
# std lib
import random
# coweb
import coweb.bot

class ZipVisitsBot(object):
    def __init__(self, botWrapper, *args):
      self.bot = botWrapper
      self.markers = {}
      self.timer = None
      
    def on_sync(self, data, username):
        # watch sync events for marker adds and moves
        if data['topic'].startswith('coweb.sync.marker.'):
            # explode topic name
            segs = data['topic'].split('.')
            # pull out action part of topic name
            action = segs[3]
            # pull out the marker id (based on known topic structure)
            mid = segs[4]
            # if we were doing real geocodes and visit lookup, we'd also pull
            # the lat/lng out of the event value and use that; here we just
            # fake data
            if action not in ['move', 'add']:
                return

            # start at some random value
            self.markers[mid] = random.randint(0, 1000)

            if self.timer is None:
                # start a timer to publish data every 5 sec
                self.timer = self.bot.add_timer(5, self.on_timer)
        
    def on_timer(self):
        # update counts for marker; if we weren't faking data, this is where
        # we'd go off a fetch the info
        for mid in self.markers:
            self.markers[mid] += random.randint(0, 10)
        # publish the updated results back to clients; include all the markers
        # but we could send just those that updated
        self.bot.publish(self.markers)
        # schedule next timer interval
        self.timer = self.bot.add_timer(5, self.on_timer)
        
    def on_shutdown(self):
        # make sure we're not hanging on a timer
        if self.timer:
            self.bot.remove_timer(self.timer)
            self.timer = None

coweb.bot.run(ZipVisitsBot)