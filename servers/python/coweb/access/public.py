'''
Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
from base import AccessBase
from acls import *

class PublicAccess(AccessBase):
    def on_admin_request(self, username, key, collab):
        '''Anyone can prep a session. No additional metadata to return.'''
        return {}
        
    def on_session_request(self, session, username):
        '''Anyone can join any session.'''
        return True
    
    def on_service_subscribe(self, session, username, serviceName):
        '''Anyone can run any installed service in any session.'''
        return True

    def on_service_unsubscribe(self, session, username, serviceName):
        '''Anyone can run any installed service in any session.'''
        return True

    def on_service_request(self, session, username, serviceName):
        '''Anyone can run any installed service in any session.'''
        return True
        
    def on_service_acls(self, session, serviceName):
        '''All services have all permissions.'''
        return ACL_SERVICE_ALL
    
    def on_service_config(self, session, serviceName):
        '''No extra metadata for launched services.'''
        return {}