package org.coweb.admin.acls;

public class ApplicationAcls {
	
	public static final int APP_HOST_BIT = 1;
	public static final int APP_ALL = 1;
	
	private int acls = 0;
	
	public ApplicationAcls(int acls) {
		this.acls = acls;
	}
	
	public ApplicationAcls() {
	}
	
	public int getAcls() {
		return this.acls;
	}
	
	public void setAll() {
		this.acls = APP_ALL;
	}
	
	public void setCanHostApp(boolean val) {
		if(val)
			this.acls |= APP_HOST_BIT;
		else
			this.acls &= ~APP_HOST_BIT;
	}
	
	public boolean canHostApp() {
		if((this.acls & APP_HOST_BIT) == 0)
			return false;
		
		return true;
	}

}
