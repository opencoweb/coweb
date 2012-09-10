package org.coweb.admin.acls;

public class SessionAcls {
    public final static int SESS_SEE_BIT = 1;
    public final static int SESS_ACCESS_BIT = 2;
    public final static int SESS_CONTROL_BIT = 4;
    public final static int SESS_CHANGE_BIT = 8;
    public final static int SESS_ALL = 15;

    // common acl combinations
    public final static int ROLE_UNINVITED = SESS_SEE_BIT;
    public final static int ROLE_GUEST = (SESS_SEE_BIT | SESS_ACCESS_BIT);
    public final static int ROLE_PARTICIPANT = (ROLE_GUEST | SESS_CONTROL_BIT);
    public final static int ROLE_MODERATOR = (ROLE_PARTICIPANT | SESS_CHANGE_BIT);

    // common descriptions of the privacy of whole sessions
    public final static int SESS_PRIVACY_PRIVATE = 0;
    public final static int SESS_PRIVACY_PUBLIC = 1;
    public final static int SESS_PRIVACY_INVITE = 2;
    public final static int SESS_PRIVACY_CUSTOM = 127;

    // common description of the schedule of a session
    // slightly out of place in here
    public final static int SESS_ACTIVITY_ANYTIME = 0;
    public final static int SESS_ACTIVITY_ACTIVE = 1;

    private int bits = 0;

    public SessionAcls(int bits) {
        this.bits = bits;
    }

    /** 
     *Sets all acls.
     */ 
    public void setAll() {
        this.bits = SESS_ALL;
    }

    public int getAcls() {
        return this.bits;
    }

    /** 
     * Gets if a user can see session metadata.
     * 
     * @return True if can view metadata, false if not 
     */
    public boolean canSeeSession() {
        return valueOf(this.bits & SESS_SEE_BIT);
    }
    
    /** 
     * Sets if a user can see session metadata.
     *
     * @param value True to set, false to unset, None to leave unchanged
     */
    public void setSeeSession(boolean value) {
        if(value)
            this.bits |= SESS_SEE_BIT;
        else
            this.bits &= ~SESS_SEE_BIT;
    }

    /**
     * Gets if a user can access/join this session.
     * 
     * @return True if can access, false if not 
     */
    public boolean canAccessSession() {
        return valueOf(this.bits & SESS_ACCESS_BIT);
    }
    
    public void setAccessSession(boolean value) {
    	if(value)
            this.bits |= SESS_ACCESS_BIT;
        else
            this.bits &= ~SESS_ACCESS_BIT;
    }

    /**
     * Gets if a user can control in this session.
     * 
     * @param value True to set, false to unset, None to leave unchanged
     * @return True if can control, false if not
     */
    public boolean canControlSession(boolean value) {
        if(value)
            this.bits |= SESS_CONTROL_BIT;
        else
            this.bits &= ~SESS_CONTROL_BIT;

        return valueOf(this.bits & SESS_CONTROL_BIT);
    }

    /** 
     *Gets if a user can change the details of this session.
     * 
     * @param value True to set, false to unset, None to leave unchanged
     * @return True if can set, false if not
     */
    public boolean canChangeSession(boolean value) {
        if(value)
            this.bits |= SESS_CHANGE_BIT;
        else
            this.bits &= ~SESS_CHANGE_BIT;

        return valueOf(this.bits & SESS_CHANGE_BIT);
    }
    
  
    private static boolean valueOf(int i) {
        if(i == 0)
            return false;

        return true;       
    }
}
