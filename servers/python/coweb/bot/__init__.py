'''
Defines classes for coweb service bots.

Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
# std lib
import json
import sys
# coweb
from reqack import ReqAckDelegate

def run(botClass):
    '''
    Looks on the command line for information about the bot wrapper to create.
    '''
    # decode json keyword arguments
    try:
        opts = json.loads(sys.argv[1])
    except Exception:
        # no-op on any kind of error; creation of wrapper expected to happen
        # in some other way
        return
    # import wrapper to use based on managerId
    mod = __import__('coweb.bot.wrapper.%s' % opts['managerId'], fromlist=[''])
    mod.run(botClass, opts)