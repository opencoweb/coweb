'''
Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
from base import UpdaterTypeMatcherBase

class DefaultUpdaterTypeMatcher(UpdaterTypeMatcherBase):
    def __init__(self, container):
        UpdaterTypeMatcherBase.__init__(self, container)
        
    def match(self, updaterType, availableUpdaterTypes):
        for availableUpdaterType in availableUpdaterTypes :
            if availableUpdaterType == updaterType:
                return availableUpdaterType
        return None
            