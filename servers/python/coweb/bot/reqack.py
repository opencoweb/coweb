'''
Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
# std lib
import logging
import json

log = logging.getLogger('coweb.bot')

class ReqAckDelegate(object):
    def __init__(self, botWrapper):
        self._bot = botWrapper
        # map action names to helper methods
        self._actionDispatch = {}

    def on_request(self, data, replyToken, username):
        '''
        Called when a client requests a coweb service. Dispatches to the proper
        subclass to handle the request.
        '''
        try:
            # determine helper to handle action
            action = data['action']
        except KeyError, e:
            log.error("requires 'action' param (%s)", str(e))
            self._bot.reply(replyToken, self._buildError(e))
            return

        try:
            # determine method on helper to handle action
            mtd = self._actionDispatch[action]
        except KeyError, e:
            log.error("sees unknown action %s", action)
            self._bot.reply(replyToken, self._buildError(e))
            return

        try:
            # handle action
            result = mtd(data, replyToken, username)
        except Exception, e:
            log.error('action %s error %s', action, str(e))
            self._bot.reply(replyToken, self._buildError(e))
            return

        # send successful response
        try:
            self._bot.reply(replyToken, self._buildResult(result))
        except Exception, e:
            log.error('json encoding error %s', str(e))
            self._bot.reply(replyToken, self._buildError(e))
            return

    def _buildResult(self, result):
        '''
        Builds a success response.
        
        @param result
        '''
        return dict(success=True, result=result)

    def _buildError(self, ex, action='unknown'):
        '''
        Builds an error response.

        @param ex
        @param action
        '''
        return dict(success=False, description=str(ex), 
            type=ex.__class__.__name__, action=action)