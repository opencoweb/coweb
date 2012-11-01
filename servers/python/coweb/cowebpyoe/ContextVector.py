"""
Context vector representation of application state. Currently, just a state
vector without undo support.

Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
"""

from OperationEngineException import OperationEngineException
from ContextDifference import ContextDifference

"""
Represents the context in which an operation occurred at a site in 
terms of the operation sequence numbers already applied at that site or
the state of the document at the time.

Initializes the sequence context vector based on the desired size of
the vector, an existing context vector, an array of integers from an
existing context vector, or the serialized state of an existing context
vector. At least one of these must be passed on the args parameter else
the constructor throws an exception. The argument properties are checked
in the order documented below. The first one encountered is used.

@constructor
@param {Number} args.count Integer number of vector entries to 
initialize to zero
@param {ContextVector} args.contextVector Context vector to copy
@param {Number[]} args.sites Array from a context vector object to copy
@param {Number[]} args.state Array from a serialized context vector 
object to reference without copy
"""
class ContextVector:
    def __init__(self, args):
        if ("count" in args):
            self.sites = []
            self.growTo(args["count"])
        elif ("contextVector" in args):
            self.sites = args["contextVector"].copySites()
        elif ("sites" in args):
            self.sites = args["sites"][:]
        elif ("state" in args):
            self.sites = args["state"]
        else:
            raise OperationEngineException("uninitialized context vector")

    """
    Converts the contents of this context vector sites array to a string.

    @returns {String} All integers in the vector (for debug)
    """
    def toString(self):
        return "[" + str(self.sites) + "]"

    """
    Serializes this context vector.

    @returns {Number[]} Array of integer sequence numbers
    """
    def getState(self):
        return self.sites

    """
    Makes an independent copy of this context vector.

    @returns {ContextVector} Copy of this context vector
    """
    def copy(self):
        return ContextVector({"contextVector" : self})

    """
    Makes an independent copy of the array in this context vector.

    @return {Number[]} Copy of this context vector's sites array
    """
    def copySites(self):
        return self.sites[:]

    """
    Computes the difference in sequence numbers at each site between this
    context vector and the one provided.

    @param {ContextVector} cv Other context vector object
    @returns {ContextDifference} Represents the difference between this
    vector and the one passed
    """
    def subtract(self, cv):
        cd = ContextDifference()
        for i in range(len(self.sites)):
            a = self.getSeqForSite(i)
            b = cv.getSeqForSite(i)
            if (a - b > 0):
                cd.addRange(i, b+1, a+1)
        return cd
    
    """
    Finds the oldest sequence number in the difference in sequence numbers
    for each site between this context and the one provided.

    @param {ContextVector} cv Other context vector object
    @returns {ContextDifference} Represents the oldest difference for each
    site between this vector and the one passed
    """
    def oldestDifference(self, cv):
        cd = ContextDifference()
        for i in range(len(self.sites)):
            a = self.getSeqForSite(i)
            b = cv.getSeqForSite(i)
            if (a - b > 0):
                cd.addSiteSeq(i, b + 1)
        return cd

    """
    Increases the size of the context vector to the given size. Initializes
    new entries with zeros.

    @param {Number} count Desired integer size of the vector
    """
    def growTo(self, count):
        for i in range(len(self.sites), count):
            self.sites.append(0)

    """
    Gets the sequence number for the given site in this context vector.
    Grows the vector if it does not include the site yet.

    @param {Number} site Integer site ID
    @returns {Number} Integer sequence number for the site
    """
    def getSeqForSite(self, site):
        if (len(self.sites) <= site):
            self.growTo(site+1)
        return self.sites[site]

    """
    Sets the sequence number for the given site in this context vector.
    Grows the vector if it does not include the site yet.

    @param {Number} site Integer site ID
    @param {Number} seq Integer sequence number
    """
    def setSeqForSite(self, site, seq):
        if (len(self.sites) <= site):
            self.growTo(site+1)
        self.sites[site] = seq

    """
    Gets the size of this context vector.

    @returns {Number} Integer size
    """
    def getSize(self):
        return len(self.sites)

    """
    Determines if this context vector equals the other in terms of the
    sequence IDs at each site. If the vectors are of different sizes, treats
    missing entries as suffixed zeros.

    @param {ContextVector} cv Other context vector
    @returns {Boolean} True if equal, false if not
    """
    def equals(self, cv):
        return True if (0 == self.compare(cv)) else False

    """
    Computes an ordered comparison of two context vectors according to the
    sequence IDs at each site. If the vectors are of different sizes, 
    treats missing entries as suffixed zeros.

    @param {ContextVector} cv Other context vector
    @returns {Number} -1 if this context vector is ordered before the other,
      0 if they are equal, or 1 if this context vector is ordered after the
      other
    """
    def compare(self, cv):
        a = self.sites
        b = cv.sites
        la = len(a)
        lb = len(b)
        m = max(la, lb)
        for i in range(0, m):
            va = a[i] if (i < la) else 0
            vb = b[i] if (i < lb) else 0
            if (va < vb):
                return -1
            elif (va > vb):
                return 1
        return 0

