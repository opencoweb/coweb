"""
Difference between two contexts in terms of operations.

Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
"""

from factory import factory

class ContextDifference:
    """
    Stores the difference in operations between two contexts in terms of
    site IDs and sequence numbers.
    @constructor
    """
    def __init__(self):
        self.sites = []
        self.seqs = []

    """
    Adds a range of operations to the difference.

    @param {Number} site Integer site ID
    @param {Number} start First integer operation sequence number, inclusive
    @param {Number} end Last integer operation sequence number, exclusive
    """
    def addRange(self, site, start, end):
        for i in range(start, end):
            self.addSiteSeq(site, i)

    """
    Adds a single operation to the difference.

    @param {Number} site Integer site ID
    @param {Number} seq Integer sequence number
    """
    def addSiteSeq(self, site, seq):
        self.sites.append(site)
        self.seqs.append(seq)

    """
    Gets the histor buffer keys for all the operations represented in this
    context difference.

    @return {String[]} Array of keys for HistoryBuffer lookups
    """
    def getHistoryBufferKeys(self):
        arr = []
        l = len(self.seqs)
        for i in range(0, l):
            key = factory.createHistoryKey(self.sites[i], self.seqs[i])
            arr.append(key)
        return arr

    """
    Converts the contents of this context difference to a string.

    @return {String} All keys in the difference (for debug)
    """
    def toString(self):
        return str(self.getHistoryBufferKeys())

