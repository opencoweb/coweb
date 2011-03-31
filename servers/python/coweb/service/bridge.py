'''
Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
# tornado
import tornado.ioloop
# std lib
import logging
import uuid
import weakref
import time
# coweb
from botstate import BotState
from ..access import ACL_SERVICE_SYNC

log = logging.getLogger('coweb.service')

class ServiceSessionBridge(object):
    '''
    Bridges session manager and service launcher and manager to allow users to
    contact bots and vice versa.
    '''
    def __init__(self, container, session, shutdownDelay=5):
        # weakref to owning session
        self.session = weakref.proxy(session)
        # id of owning session
        self.sessionId = self.session.get_session_id()
        # delay before forcefully terminating services on session end
        self.shutdownDelay = shutdownDelay
        # store container
        self.container = container
        # store access manager for convenience
        self.access = container.access
        # service launcher
        self.launcher = self.container.on_build_service_launcher(self)
        # service manager
        self.manager = self.container.on_build_service_manager(self)
        # needs sync events for at least one service?
        self.needsSync = False

        # known bot instances
        self.activeBots = {}

    def start_services(self):
        '''Starts services in a session.'''
        self.manager.start_services()
        log.info('started services in %s', self.sessionId)

    def end_services(self):
        '''Ends services in a session.'''
        # send shutdown requests
        for bot in self.activeBots.values():
            # give bots a chance to shutdown
            msg = self.manager.on_shutdown_request(bot.serviceName)
            if bot.is_subscribed():
                self.manager.send_message(msg, bot.impl)
            else:
                bot.queue.append(msg)
        # foribly kill all processes after a delay to allow them to
        # shut down gracefully if possible
        io = tornado.ioloop.IOLoop.instance()
        io.add_timeout(time.time() + self.shutdownDelay, self._force_shutdown)

    def _force_shutdown(self):
        '''Instruct launcher to stop all services and destroy this object.'''
        # force quit all services that didn't end on their own
        self.launcher.stop_all_services(self.manager)
        # notify manager services have ended
        self.manager.end_services()
        log.info('ended services in %s', self.sessionId)

    def get_session_id(self):
        '''Gets associated session ID.'''
        return self.sessionId

    def _activate_bot(self, serviceName):
        '''Gets bot state. Starts it if not yet running.'''
        # check if bot running
        try:
            bot = self.activeBots[serviceName]
        except KeyError:
            # ask container for bot acls
            acls = self.access.on_service_acls(self.session, serviceName)
            # build a bot state object
            bot = BotState(serviceName, uuid.uuid4().hex, acls)
            # decide if tracking sync or not now
            self.needsSync |= (acls & ACL_SERVICE_SYNC)
            # ask container if any additional params for service
            appData = self.access.on_service_config(self.session, serviceName)
            # launch the bot because not started
            self.launcher.start_service(bot.serviceName, bot.token, 
                self.manager, appData)
            # store bot state for future lookup
            self.activeBots[serviceName] = bot
        return bot

    def deactivate_bot(self, serviceName):
        '''Remove bot state when notified it is dead.'''
        try:
            bot = self.activeBots[serviceName]
            del self.activeBots[serviceName]
        except KeyError:
            pass
        # see if we need to track sync events anymore
        for bot in self.activeBots.values():
            if bot.acls & ACL_SERVICE_SYNC:
                self.needsSync = True
                return
        self.needsSync = False

    def auth_bot(self, serviceName, token, impl=None):
        '''Checks bot credentials against the bot service name and token.'''
        # check if this is a bot we launched
        try:
            bot = self.activeBots[serviceName]
        except KeyError:
            return False
        # check token as password
        if bot.token == token:
            bot.set_authed(impl)
            return True
        return False
        # @todo: should clean up bots that haven't authed after some time
        
    def mark_bot_subscribed(self, serviceName):
        '''
        Marks a bot as subscribed. Forwards any queued messages to the 
        manager for transmission to the bot.
        '''
        bot = self.activeBots[serviceName]
        msgs = bot.set_subscribed()
        # forward any held messages
        for msg in msgs:
            self.manager.send_message(msg, bot.impl)

    def on_user_sync(self, user, req):
        '''Sends a session sync event to all bots with acls to receive it.'''
        data = req['data']
        username = user.username
        for bot in self.activeBots.values():
            if bot.acls & ACL_SERVICE_SYNC:
                # forward sync events if allowed
                msg = self.manager.on_user_sync(bot.serviceName, username, data)
                # decide whether to queue or send now based on bot state
                if bot.is_subscribed():
                    self.manager.send_message(msg, bot.impl)
                else:
                    bot.queue.append(msg)

    def on_user_request(self, user, req, res):
        '''Sends a user request to a bot.'''
        # parse channel name from publish request
        ch = req['channel']
        segs = ch.split('/')
        # must be exactly 5 segments ['', 'service', 'bot', name, 'request']
        if len(segs) != 5 or segs[-1] != 'request':
            res['error'] = '402:%s:not-allowed' % user.clientId
            log.warn('improper publish to bot channel "%s" in %s', 
                ch, self.sessionId)
            return False
        serviceName = segs[-2]
        
        # check access to bot
        if not self.access.on_service_request(self.session, user.username, 
        serviceName):
            res['successful'] = False
            res['error'] = '402:%s:not-allowed' % client.clientId
            log.warn('bot "%s" access denied in session %s', serviceName, 
                self.sessionId)
            return False
            
        # activate the bot
        try:
            bot = self._activate_bot(serviceName)
        except ValueError:
            res['successful'] = False
            res['error'] = '400:%s:not-found' % user.clientId
            log.warn('bot "%s" not found in %s', serviceName, 
                self.sessionId)
            return False
        except Exception:
            res['successful'] = False
            res['error'] = '500:%s:server-error' % user.clientId
            log.exception('server error activating "%s" bot in %s', serviceName,
                self.sessionId)
            return False

        # create token for request
        token = uuid.uuid4().hex
        # send request along to bot
        value = req['data']['value']
        # ask service manager to build request message
        msg = self.manager.on_user_request(bot.serviceName, user.username, 
            token, value)
        # stash info for later bot response
        bot.push_request(token, req['clientId'], req['id'], req['data']['topic'])
        # decide whether to queue or send now based on bot state
        if bot.is_subscribed():
            self.manager.send_message(msg, bot.impl)
        else:
            bot.queue.append(msg)
        return True

    def on_user_subscribe(self, user, req, res, public):
        '''Sends a user subscription notice to a bot.'''
        # parse channel name in subscription request
        ch = req['subscription']
        segs = ch.split('/')
        if public:
            # must be exactly 3 segments ['', 'bot', name]
            if len(segs) != 3:
                res['successful'] = False
                res['error'] = '402:%s:not-allowed' % user.clientId
                log.warn('improper subscription to bot channel "%s" in %s', 
                    ch, self.sessionId)
                return False
            serviceName = segs[-1]
        else:
            # must be exactly 5 segments ['', 'service', 'bot', name, 'response']
            if len(segs) != 5 or segs[-1] != 'response':
                res['successful'] = False
                res['error'] = '402:%s:not-allowed' % user.clientId
                log.warn('improper subscription to bot channel "%s" in %s', 
                    ch, self.sessionId)
                return False
            serviceName = segs[-2]

        # check access to bot
        if not self.access.on_service_subscribe(self.session, user.username, 
        serviceName):
            res['successful'] = False
            res['error'] = '402:%s:not-allowed' % client.clientId
            log.warn('bot "%s" access denied in session %s', serviceName, 
                self.sessionId)
            return False
            
        # activate the bot
        try:
            bot = self._activate_bot(serviceName)
        except ValueError:
            res['successful'] = False
            res['error'] = '400:%s:not-found' % user.clientId
            log.warn('bot "%s" not found in %s', serviceName, 
                self.sessionId)
            return False
        except Exception:
            res['successful'] = False
            res['error'] = '500:%s:server-error' % user.clientId
            log.exception('server error activating "%s" bot in %s', serviceName,
                self.sessionId)
            return False
        
        if public:
            # send public subscribe notification for bot
            msg = self.manager.on_user_subscribe(bot.serviceName, user.username)
            # decide whether to queue or send now based on bot state
            if bot.is_subscribed():
                self.manager.send_message(msg, bot.impl)
            else:
                bot.queue.append(msg)
        return True
    
    def on_user_unsubscribe(self, user, req, res, public):
        '''Sends a user unsubscribe notice to a bot.'''
        # parse channel name in unsubscribe request
        ch = req['subscription']
        segs = ch.split('/')
        if public:
            # must be exactly 3 segements ['', 'bot', name]
            if len(segs) != 3:
                res['successful'] = False
                res['error'] = '402:%s:not-allowed' % user.clientId
                log.warn('improper subscription to bot channel "%s" in %s', 
                    ch, self.sessionId)
                return False
            serviceName = segs[-1]
        else:
            # must be exactly 5 segments ['', 'service', 'bot', name, 'response']
            if len(segs) != 5 or segs[-1] != 'response':
                res['successful'] = False
                res['error'] = '402:%s:not-allowed' % user.clientId
                log.warn('improper subscription to bot channel "%s" in %s', 
                    ch, self.sessionId)
                return False
            serviceName = segs[-2]
                
        # check access to bot
        if not self.access.on_service_unsubscribe(self.session, user.username, 
        serviceName):
            res['successful'] = False
            res['error'] = '402:%s:not-allowed' % client.clientId
            log.warn('bot "%s" access denied in session %s', serviceName, 
                self.sessionId)
            return False

        if not public:
            # nothing to do for private unsubscribe
            return True
        
        # check if bot running
        try:
            bot = self.activeBots[serviceName]
        except KeyError:
            # ignore, no bot running for unsubscribe
            return False

        # send public unsubscribe notification for bot
        msg = self.manager.on_user_unsubscribe(bot, user.username)
        # decide whether to queue or send now based on bot state
        if bot.is_subscribed():
            self.manager.send_message(msg, bot.impl)
        else:
            bot.queue.append(msg)        
        return True

    def on_user_unsubscribe_all(self, user):
        '''Sends a user unsubscribe notice to all running bots.'''
        # @todo: invoke access manager policy? or just always send?
        for serviceName in self.activeBots:
            # send public unsubscribe notification for bot
            self.manager.on_user_unsubscribe(serviceName, user.username)
    
    def on_bot_response(self, serviceName, token, data):
        '''Sends a bot response to a particular user request.'''
        # get the bot state
        bot = self.activeBots[serviceName]
        # ensure bot in proper state
        if not bot.is_subscribed():
            raise ValueError('bot not subscribed')
        # make sure the token is one we're waiting for
        clientInfo = bot.pop_request(token)

        # build the bot response
        msg = {
            'channel' : '/service/bot/%s/response' % serviceName,
            'data' : {
                'topic' : clientInfo[2],
                'value' : data
            },
            'id' : clientInfo[1]
        }
        # queue the response for the user
        try:
            client = self.session.get_client(clientInfo[0])
        except KeyError:
            # ignore, dead client
            return
        client.add_message(msg)

    def on_bot_publish(self, serviceName, data):
        '''Sends a bot publish to all subscribed users.'''
        # get the bot state
        bot = self.activeBots[serviceName]
        # ensure bot in proper state
        if not bot.is_subscribed():
            raise ValueError('bot not subscribed')

        # build the publish message
        msg = {
            'channel' : '/bot/%s' % serviceName,
            'data' : {
                'value' : data
            }
        }
        # queue publish for clients
        self.session.publish(msg)