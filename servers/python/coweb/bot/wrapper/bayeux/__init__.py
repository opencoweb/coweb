'''
Defines a wrapper for running service bots that communicate with a coweb
server session using Bayeux over WebSocket.

Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
# std lib
import logging
# coweb
from loop import AsyncoreLoop
from wrapper import BayeuxBotWrapper

def run(botClass, opts):
    '''Creates a bot wrapper and enters the main loop.'''
    # basic logger configuration
    logging.basicConfig(level=logging.INFO)
    # build a loop for scheduling callbacks
    ioLoop = AsyncoreLoop()
    w = BayeuxBotWrapper(botClass, opts['serviceName'], opts['serviceToken'],
    ioLoop, opts['connectionInfo'], opts['appData'])
    # initiate the handshake
    w.handshake()
    # run the loop
    ioLoop.start()