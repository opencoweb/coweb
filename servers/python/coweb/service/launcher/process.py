'''
Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
# tornado
import tornado.ioloop
import tornado.web
# std lib
import logging
import json
import os
import pwd
import shlex
import functools
import signal
import subprocess
import sys
# coweb
from base import ServiceLauncherBase

log = logging.getLogger('coweb.service')

class ProcessLauncher(ServiceLauncherBase):
    '''Service launcher that runs bots as local processes.'''
    def __init__(self, container, bridge, botPaths=[], sandboxUser='nobody'):
        super(ProcessLauncher, self).__init__(container, bridge)
        self._sessionId = self._bridge.get_session_id()
        self._tracker = ProcessTracker.instance()
        # store local bot paths
        self._botPaths = botPaths
        # get sandbox user info
        self._sandboxUserInfo = None

        if sys.platform == 'cygwin' or os.getuid() != 0:
            # not running as root, so can't launch bots as sandbox user
            log.warn('server not run as root; launching bots as current user')
        else:
            try:
                self._sandboxUserInfo = pwd.getpwnam(sandboxUser)
            except KeyError:
                # sandbox user not found or not configured
                log.warn('sandbox user not found; launching bots as current user')

    def start_service(self, serviceName, token, serviceManager, appData):
        '''Starts a bot process to handle a service.'''
        # find bot that handles this service
        botInfo = self._get_service_info(serviceName)
        if botInfo is None:
            # service not found
            raise ValueError('%s bot not found' % serviceName)

        # build command line config
        cfg = {
            'serviceName' : serviceName,
            'serviceToken' : token,
            'managerId' : serviceManager.get_manager_id(),
            'connectionInfo' : serviceManager.get_connection_info(),
            'appData' : appData
        }
        # build command line args
        args, kwargs = self._build_command(cfg, botInfo)
        # launch the bot
        key = (self._sessionId, serviceName)
        self._tracker.launch_process(key, self.on_child_dead, *args, **kwargs)
        log.info('%s bot started in %s', serviceName, self._sessionId)
        return True
        
    def stop_service(self, serviceName, serviceManager):
        '''Stops a single bot process.'''
        self._tracker.terminate_process((self._sessionId, serviceName))

    def stop_all_services(self, serviceManager):
        '''Stops all running bot processes.'''
        self._tracker.terminate_all_processes(subkey=(self._sessionId,))

    def on_child_dead(self, key):
        '''Called when a bot subprocess ends. Notifies the manager.'''
        # don't do this within the signal handler, add it to the ioloop
        sessionId, serviceName = key
        io = tornado.ioloop.IOLoop.instance()
        io.add_callback(functools.partial(self._bridge.deactivate_bot, 
            serviceName))
        log.info('%s bot dead in %s', serviceName, sessionId)

    def _get_service_info(self, serviceName):
        '''Loads service bot metadata from the bot path on disk.'''
        # find a bot that handles the service
        botDesc = None
        for path in self._botPaths:
            jpath = os.path.join(path, serviceName, 'bot.json')
            try:
                f = file(jpath)
            except IOError:
                continue
            try:
                info = json.load(f)
                # add bot path to info
                info['path'] = os.path.dirname(jpath)
                return info
            except Exception:
                log.exception('error parsing bot.json')
            finally:
                f.close()
        return None

    def _build_command(self, cfg, botInfo):
        '''Builds the arguments needed by subprocess.Popen.'''
        # build command line to execute
        args = []
        # shlex doesn't support unicode yet ... grr
        cmd = botInfo['execute'].encode('utf-8', 'replace')
        args.extend(shlex.split(cmd))
        # encode arguments as json
        js = json.dumps(cfg)
        args.append(js)

        # put parent of module in python path
        env = {}
        env.update(os.environ)
        
        # include the location of the coweb package in the python path
        pp = env.get('PYTHONPATH')
        env['PYTHONPATH'] = os.path.dirname(self._container.modulePath)
        if pp:
            env['PYTHONPATH'] += ':' + pp

        # run as sandbox user by default
        if self._sandboxUserInfo is not None:
            preexec_fn = self._run_in_sandbox
        else:
            preexec_fn = None
            log.warn('sandbox not configured; launching "%s" as current user',
                botInfo['service'])

        # keyword args for subprocess
        kwargs = dict(preexec_fn=preexec_fn, cwd=botInfo['path'], env=env)
        return args, kwargs

    def _run_in_sandbox(self):
        '''Ensures a bot runs as the sandbox user.'''
        os.setgid(self._sandboxUserInfo.pw_gid)
        os.setuid(self._sandboxUserInfo.pw_uid)

class ProcessTracker(object):
    _instance = None
    '''
    Supports the launching and reaping of child processes across an entire 
    process.
    '''
    def __init__(self):
        self._processes = {}
        self._origTermHandler = signal.signal(signal.SIGTERM, 
                                             self._handle_sigterm)
        if not callable(self._origTermHandler):
            self._origTermHandler = None
        self._origChldHandler = signal.signal(signal.SIGCHLD, 
                                             self._handle_sigchld)
        if not callable(self._origChldHandler):
            self._origChldHandler = None
            
    @classmethod
    def instance(cls):
        if not cls._instance:
            cls._instance = cls()
        return cls._instance

    def launch_process(self, key, callback, *args, **kwargs):
        '''
        Starts a new child processes. Stores its PID under the given key.

        @param key Key used to later retrieve the process information
        @param callback Callable to invoke when the process dies
        @param args Arbitrary positional args passed to Popen
        @return Child process Popen object
        '''
        child = subprocess.Popen(args, **kwargs)
        self._processes[key] = (child, callback)
        return child
        
    def terminate_process(self, key):
        '''
        Stops a child process previously launched.
        
        @param key Key used to later retrieve the process information
        '''
        child, callback = self._processes[key]
        child.terminate()
        # leave in dict til sigchld, it cleans up dead info
        
    def _match_subkey(self, key, subkey):
        for i, seg in enumerate(subkey):
            if seg != key[i]: return False
        return True
        
    def terminate_all_processes(self, subkey=None):
        '''
        Stops all child processes previously launched.
        '''
        for key, value in self._processes.items():
            if subkey and self._match_subkey(key, subkey):
                child, callback = value
                try:
                    child.terminate()
                except Exception:
                    log.exception('terminate child')

    def has_process(self, key):
        '''
        Gets if a process with the given key exists.

        @param key Key used to start process
        @return True if exists, False otherwise
        '''
        return self._processes.has_key(key)

    def _kill_zombies(self):
        '''
        Reap all zombie child processes.
        '''
        for key, value in self._processes.items():
            child, callback = value
            if child.poll() is not None:
                try:
                    del self._processes[key]
                except KeyError:
                    continue
                try:
                    callback(key)
                except Exception:
                    log.exception('sigchld callback')

    def _handle_sigchld(self, signum, stack):
        '''
        Called on SIGCHLD. Invokes the original signal handler. Invokes 
        _killZombies.

        @param signum Always SIGCHLD
        @param stack Stack at time of interrupt
        '''
        if self._origChldHandler is not None:
            self._origChldHandler(signum, stack)
        self._kill_zombies()
        
    def _handle_sigterm(self, signum, stack):
        '''
        Cleans up all child prcesses when this processes is terminated with
        SIGTERM.

        @param signum Always SIGTERM
        @param stack Stack at time of interrupt
        '''
        self.terminate_all_processes()
        if self._origTermHandler is not None:
            self._origTermHandler(signum, stack)