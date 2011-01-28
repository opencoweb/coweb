'''
Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
# std lib
import imp
import sys
import os
# coweb
from base import ServiceLauncherBase
import coweb.bot

class ObjectLauncher(ServiceLauncherBase):
    '''Service launcher that imports Python bots into the local process.'''
    def __init__(self, container, bridge, botPaths=[]):
        super(ObjectLauncher, self).__init__(container, bridge)
        self._botPaths = botPaths
        self._botClass = None
        coweb.bot.run = self._local_run
        
    def _local_run(self, botClass):
        self._botClass = botClass
    
    def _get_module(self, serviceName):
        # need to import each time to get the run() call
        paths = [os.path.join(path, serviceName) for path in self._botPaths]
        fp, path, description = imp.find_module(serviceName, paths)
        try:
            return imp.load_module(serviceName, fp, path, description)
        finally:
            if fp: fp.close()
    
    def start_service(self, serviceName, token, serviceManager, appData):
        '''
        Called to launch a new service for a session. Expected to raise
        a ValueError if the service is unknown or any other Exception if there
        is a problem starting the service.
        '''
        mod = self._get_module(serviceName)
        if mod is None or self._botClass is None:
            raise ValueError('service not found')
        bc, self._botClass = self._botClass, None
        serviceManager.add_bot(bc, serviceName, token, appData)
        
    def stop_service(self, serviceName, serviceManager):
        '''
        Called to end a service for a session. No expected return value.
        '''
        serviceManager.remove_bot(serviceName)
        
    def stop_all_services(self, serviceManager):
        '''
        Called to end all services for a session. No expected return value.
        '''
        serviceManager.remove_all_bots()