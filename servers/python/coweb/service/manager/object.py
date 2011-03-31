'''
Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
# coweb
from base import ServiceManagerBase
from ...bot.wrapper.object import ObjectBotWrapper

class ObjectServiceManager(ServiceManagerBase):
    def get_manager_id(self):
        '''Manager id is object matching wrapper module name.'''
        return 'object'

    def get_connection_info(self):
        '''No connection info needed. It's a local object.'''
        return {}
        
    def start_services(self):
        '''Initialize bot dict.'''
        self._bots = {}
        
    def end_services(self):
        '''Throw away bot list.'''
        self._bots = None
       
    def send_message(self, msg, impl):
        '''Forward message directly to implementation.'''
        impl.on_message(*msg)

    def on_user_request(self, serviceName, username, token, value):
        return ('on_request', value, token, username)
        
    def on_user_subscribe(self, serviceName, username):
        return ('on_subscribe', username)
        
    def on_user_unsubscribe(self, serviceName, username):
        return ('on_unsubscribe', username)
    
    def on_shutdown_request(self, serviceName):
        return ('on_shutdown',)
    
    def on_user_sync(self, serviceName, username, data):
        return ('on_sync', data, username)
    
    def add_bot(self, botClass, serviceName, serviceToken, appData):
        w = ObjectBotWrapper(self, botClass, serviceName, serviceToken, appData)
        self._bots[serviceName] = w
        
    def remove_bot(self, serviceName):
        del self._bots[serviceName]
        # stop tracking bot in the bridge
        self._bridge.deactivate_bot(serviceName)
        
    def remove_all_bots(self):
        for servicename in self._bots:
            # maybe not necessary, but not harmful either
            self._bridge.deactivate_bot(servicename)
        self._bots = {}
    
    def on_bot_ready(self, serviceName, serviceToken, botWrapper):
        if not self._bridge.auth_bot(serviceName, serviceToken, botWrapper):
            self.remove_bot(serviceName)
            return
        self._bridge.mark_bot_subscribed(serviceName)
    
    def on_bot_publish(self, serviceName, data):
        self._bridge.on_bot_publish(serviceName, data)
        
    def on_bot_response(self, serviceName, replyToken, data):
        self._bridge.on_bot_response(serviceName, replyToken, data)