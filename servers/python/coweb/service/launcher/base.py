'''
Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
import weakref

class ServiceLauncherBase(object):
    '''Base class for service launcher.'''
    def __init__(self, container, bridge):
        self._bridge = weakref.proxy(bridge)
        self._container = container

    def start_service(self, serviceName, token, serviceManager, appData):
        '''
        Called to launch a new service for a session. Expected to raise
        a ValueError if the service is unknown or any other Exception if there
        is a problem starting the service.
        '''
        raise NotImplementedError
        
    def stop_service(self, serviceName, serviceManager):
        '''
        Called to end a service for a session. No expected return value.
        '''
        raise NotImplementedError
        
    def stop_all_services(self, serviceManager):
        '''
        Called to end all services for a session. No expected return value.
        '''
        raise NotImplementedError