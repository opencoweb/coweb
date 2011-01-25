'''
Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
from base import BayeuxExtBase

class BayeuxEcholessExt(BayeuxExtBase):
    '''Bayeux extension to avoid publishing back to sending client.'''
    def add_message(self, cl, msg, senderId):
        # don't queue message if the senderId == the receiver ID  
        return cl.clientId != senderId