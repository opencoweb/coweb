'''
Coweb session management.

Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
from session import Session
from collab import CollabSession

def create_session(collab, *args, **kwargs):
    '''Builds a cooperative or non-cooperative session.'''
    cls = CollabSession if collab else Session
    return cls(*args, **kwargs)