"""
Table of context vectors of known sites.

Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
"""

from .ContextVector import ContextVector

"""
Stores the context of each site known at this site.

Initializes the table to include the given context vector at the given
site index. Ensures the table has enough empty context vectors up to
the given site ID.

Supports the freezing and unfreezing of slots in the table as the
corresponding sites start and stop participating in operational
transformation.

@constructor
@param {ContextVector} Context vector to store in the table at the
    given index
@param {Number} index Integer site ID representing the index at which to
    store the initial context vector
"""
class ContextVectorTable:

    def __init__(self, cv, site):
        self.cvt = []
        self.growTo(site+1)
        self.cvt[site] = cv

    """
    Converts the contents of this context vector table to a string.

    @return {String} All context vectors in the table (for debug)
    """
    def toString(self):
        arr = []
        l = len(self.cvt)
        for i in range(l):
            cv = self.cvt[i]
            arr.append(cv.toString())
        return str(arr)

    """
    Gets the index of each entry in the table frozen to (i.e., sharing a
    reference with, the given context vector, skipping the one noted in the
    skip param.

    @param {ContextVector} cv Context vector instance
    @param {Number} skip Integer index to skip
    @returns {Number[]} Integer indices of table slots referencing the
    context vector
    """
    def getEquivalents(self, cv, skip):
        equiv = []
        l = len(self.cvt)
        for i in range(l):
            if (i != skip and self.cvt[i] == cv):
                equiv.append(i)
        return equiv

    """
    Serializes the state of this context vector table for transmission.

    @returns {Array[]} Array of context vectors serialized as arrays
    """
    def getState(self):
        arr = []
        l = len(self.cvt)
        for i in range(l):
            arr.append(self.cvt[i].getState())
        return arr

    """
    Unserializes context vector table contents to initialize this intance.

    @param {Array[]} arr Array in the format returned by getState
    """
    def setState(self, arr):
        """ clear out any existing state """
        self.cvt = []
        l = len(arr)
        for i in range(l):
            self.cvt[i] = ContextVector({"state" : arr[i]})

    """
    Increases the size of the context vector table to the given size.
    Inceases the size of all context vectors in the table to the given size.
    Initializes new entries with zeroed context vectors.

    @param {Number} count Desired integer size
    """
    def growTo(self, count):
        """ grow all context vectors """
        l = len(self.cvt)
        for i in range(l):
            self.cvt[i].growTo(count)
        """ add new vectors of proper size """
        l = len(self.cvt)
        for i in range(l, count):
            cv = ContextVector({"count" : count})
            self.cvt.append(cv)

    """
    Gets the context vector for the given site. Grows the table if it does
    not include the site yet and returns a zeroed context vector if so.

    @param {Number} site Integer site ID
    @returns {ContextVector} Context vector for the given site
    """
    def getContextVector(self, site):
        if (len(self.cvt) <= site):
            """ grow to encompass the given site at least """
            """ this is not necessarily the final desired size... """
            self.growTo(site+1)
        return self.cvt[site]

    """
    Sets the context vector for the given site. Grows the table if it does
    not include the site yet.

    @param {Number} site Integer site ID
    @param {ContextVector} cv Context vector instance
    """
    def updateWithContextVector(self, site, cv):
        if (len(self.cvt) <= site):
            """ grow to encompass the given site at least """
            self.growTo(site+1)
        if (cv.getSize() <= site):
            """ make sure the given cv is of the right size too """
            cv.growTo(site+1)
        self.cvt[site] = cv

    """
    Sets the context vector for the site on the given operation. Grows the
    table if it does not include the site yet.

    @param {Operation} op Operation with the site ID and context vector
    """
    def updateWithOperation(self, op):
        """ copy the context vector from the operation """
        cv = op.contextVector.copy()
        """ upgrade the cv so it includes the op """
        cv.setSeqForSite(op.siteId, op.seqId)
        """ store the cv """
        self.updateWithContextVector(op.siteId, cv)

    """
    Gets the context vector with the minimum sequence number for each site
    among all context vectors in the table. Gets null if the minimum
    vector cannot be constructed because the table is empty.

    @returns {ContextVector|null} Minium context vector
    """
    def getMinimumContextVector(self):
        """ if table is empty, abort """
        if (len(self.cvt) <= 0):
            return None

        """ start with first context vector as a guess of which is minimum """
        mcv = self.cvt[0].copy()

        l = len(self.cvt)
        for i in range(1, l):
            cv = self.cvt[i]
            """ cvt has to equal the max vector size contained within """
            for site in range(l):
                seq = cv.getSeqForSite(site)
                m = mcv.getSeqForSite(site)
                if(seq < m):
                    """ take smaller of the two sequences numbers for each site """
                    mcv.setSeqForSite(site, seq)
        return mcv

