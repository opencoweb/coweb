'''
Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
class UpdaterTypeMatcherBase():
    def __init__(self, container):
        self._container = container
        
    def match(self, updaterType, availableUpdaterTypes):
        raise NotImplementedError