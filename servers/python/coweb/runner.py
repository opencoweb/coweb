'''
Server runner.

Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
# tornado
import tornado.httpserver
import tornado.ioloop
import tornado.web
import tornado.options
# std lib
import os
import json
import logging

log = logging.getLogger('coweb')

# app command line options
tornado.options.define('port', type=int, default=None, help='server port number (default: use app specified)')
tornado.options.define('debug', type=bool, default=False, help='run in debug mode with autoreload (default: false)')

def run_server(containerCls):
    '''Runs a coweb server instance given an AppContainer subclass.'''
    # parse command line
    tornado.options.parse_command_line()
    options = tornado.options.options

    # build the container instance
    container = containerCls(options)

    log.info('coweb server starting in: %s', container.containerPath)
    log.info('using coweb module in: %s', container.modulePath)
    log.info('serving static files in: %s', container.httpStaticPath)
    log.info('using local bots in: %s', container.cowebBotLocalPaths)
    log.info('debug enabled: %s', options.debug)

    # kick off main web app loop
    http_server = tornado.httpserver.HTTPServer(container.webApp)
    http_server.listen(container.httpPort)
    ioloop = tornado.ioloop.IOLoop.instance()
    log.info('started on port: %d', container.httpPort)
    ioloop.start()