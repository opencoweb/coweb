'''
Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
# std lib
import datetime
# coweb
import coweb.bot

class TimeBot(object):
    def __init__(self, botWrapper, *args):
      self.bot = botWrapper
      
    def on_request(self, data, replyToken, username):
        print 'utctime bot on_request: %s, %s, %s' % (data, replyToken, username)
        self.bot.reply(replyToken, {'time': str(datetime.datetime.utcnow())})
    
    def on_subscribe(self, username):
        print 'utctime bot on_subscribe:', username
        
    def on_unsubscribe(self, username):
        print 'utctime bot on_unsubscribe:', username
    
    def on_shutdown(self):
        print 'utctime bot on_shutdown'

coweb.bot.run(TimeBot)