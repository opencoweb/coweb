'''
Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
# coweb
import coweb.bot

class EchoBot(object):
    def __init__(self, botWrapper, *args):
        self.bot = botWrapper
      
    def on_request(self, data, replyToken, username):
        print 'echo bot on_request: %s, %s, %s' % (data, replyToken, username)
        self.bot.reply(replyToken, {'success': True})
        self.bot.publish(data)
    
    def on_subscribe(self, username):
        print 'echo bot on_subscribe:', username
        
    def on_unsubscribe(self, username):
        print 'echo bot on_unsubscribe', username
    
    def on_shutdown(self):
        print 'echo bot on_shutdown'

coweb.bot.run(EchoBot)