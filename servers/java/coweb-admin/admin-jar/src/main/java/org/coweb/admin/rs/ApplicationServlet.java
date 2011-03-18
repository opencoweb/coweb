package org.coweb.admin.rs;

import java.io.IOException;
import java.io.Reader;
import java.util.List;
import java.util.Map;

import javax.servlet.ServletConfig;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.coweb.admin.acls.SessionAcls;
import org.coweb.admin.Admin;
import org.coweb.admin.AdminImpl;

import org.apache.wink.json4j.JSONArray;
import org.apache.wink.json4j.JSONObject;


public class ApplicationServlet extends HttpServlet {
	
	private static final long serialVersionUID = 1L;
	
	private Admin cowebAdmin;

    @Override
	public void init() throws ServletException {
		super.init();
		
		ServletConfig config = this.getServletConfig();
        String adminClass = config.getInitParameter("cowebAdminClass");

        //Create the security policy.  Default to CowebSecurityPolicy.
        if(adminClass == null)
            cowebAdmin = new AdminImpl();
        else {
            try {
                Class clazz = Class.forName(adminClass);
                cowebAdmin = (Admin)clazz.newInstance();
            }
            catch(Exception e) {
                cowebAdmin = new AdminImpl();
            }
        }
        
    }
    

	@Override
	public void doGet(HttpServletRequest req, HttpServletResponse resp) 
	throws ServletException, IOException {
		
		String path = req.getPathInfo();
		if(path.endsWith("/session"))
			this.getSessions(req, resp);
		else if(path.startsWith("/session"))
			this.getSession(req, resp);
		else if(path.startsWith("/application"))
			this.getApplication(req, resp);
		else
			resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
	}
	
	@Override
	public void doPost(HttpServletRequest req, HttpServletResponse resp) 
	throws ServletException, IOException {
		
		String path = req.getPathInfo();
		if(path.startsWith("/session"))
			this.createSession(req, resp);
		else if(path.startsWith("/application"))
			this.registerApplication(req, resp);
		else
			resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
	}
	
	@Override
	public void doPut(HttpServletRequest req, HttpServletResponse resp) 
	throws ServletException, IOException {
		
		String path = req.getPathInfo();
		if(path.startsWith("/session"))
			this.updateSession(req, resp);
		else if(path.startsWith("/application"))
			this.updateApplication(req, resp);
		else
			resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
	}
	
	@Override
	public void doDelete(HttpServletRequest req, HttpServletResponse resp) 
	throws ServletException, IOException {
		
		String path = req.getPathInfo();
		if(path.startsWith("/session"))
			this.deleteSession(req, resp);
		else if(path.startsWith("/application"))
			this.unregisterApplication(req, resp);
		else
			resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
	}
	
	private void getSessions(HttpServletRequest req, HttpServletResponse resp)
	throws ServletException {
				
		try {
			Reader r = req.getReader();
			JSONObject args = null;
			
			if(r.read() != -1) {
				r.reset();
				args = new JSONObject(req.getReader());
			}
			else
				args = new JSONObject();
			
			Integer acls = null;
			if(args.containsKey("acls"))
				acls = ((Integer)args.get("acls")).intValue();
			else
				acls = SessionAcls.SESS_SEE_BIT;
			
			System.out.println("acls = " + acls);
			String query = null;
			if(args.containsKey("query")) {
				query = (String)args.get("query");
			}
			
			String sortBy = null;
			if(args.containsKey("sortby"))
				sortBy = (String)args.get("sortby");
			
			String direction = null;
			if(args.containsKey("direction"))
				direction = (String)args.get("direction");
			
			List<Map<String, Object>> sessions = 
				cowebAdmin.getSessionsForUser(req.getRemoteUser(),
                        acls,
						query,
						sortBy,
						direction,
						-1,
						-1);
			
			System.out.println(sessions);
			
			JSONArray arr = null;
			if(sessions != null)
				arr = new JSONArray(sessions);
			else
				arr = new JSONArray();
			
			arr.write(resp.getWriter());
		}
		catch(Exception e) {
			e.printStackTrace();
			//throw new ServletException(e.getMessage());
		}
	}
	
	private void getSession(HttpServletRequest req, HttpServletResponse resp)
	throws ServletException {
		
		try {
			String path = req.getPathInfo();
			String[] parts = path.split("/");
			String sessionId = parts[parts.length-1];
			String name = getServletContext().getServletContextName();
		
			Map<String,Object> session = this.cowebAdmin.getSession(
                    req.getRemoteUser(), name, sessionId);
			JSONObject json = new JSONObject(session);
			json.write(resp.getWriter());
		}
		catch(Exception e) {
			throw new ServletException(e.getMessage());
		}
	}
	
	private void createSession(HttpServletRequest req, HttpServletResponse resp)
	throws ServletException {
		try {
			
			Reader r = req.getReader();
			
			JSONObject args = null;
			String name = getServletContext().getServletContextName();
		
			r.mark(1024);
			if(r.read() != -1) {
				
				r.reset();
				
				args = new JSONObject(r);
				System.out.println(args);
				
				if(!cowebAdmin.createSession(req.getRemoteUser(),
                            name,
						(String)args.get("title"),
						(String)args.get("description"),
						(Map<String, Integer>)args.get("aclsDict"))) {
					throw new ServletException("Error Creating Session");
				}
			}
			else
				throw new ServletException("No Session Info");
		}
		catch(Exception e) {
			e.printStackTrace();
			//throw new ServletException(e.getMessage());
		}
		
		
	}
	
	private void getApplication(HttpServletRequest req, HttpServletResponse resp)
	throws ServletException {
		
		try {
			String name = getServletContext().getServletContextName();
			Map<String, Object> application = 
                cowebAdmin.getApplication(req.getRemoteUser(), name);
			JSONObject json = new JSONObject(name);
			json.write(resp.getWriter());
		}
		catch(Exception e) {
			throw new ServletException(e.getMessage());
		}
	}
	
	
	private void registerApplication(HttpServletRequest req, HttpServletResponse resp)
	throws ServletException {
		ServletContext ctx = getServletContext();
		
		String title = ctx.getServletContextName();
		String description = ctx.getInitParameter("description");
		String appUrl = ctx.getInitParameter("appurl");
		String thumbnailUrl = ctx.getInitParameter("thumbnailurl");
		
		int ret = cowebAdmin.registerApplication(req.getRemoteUser(),
                title, 
				description, 
				appUrl, 
				thumbnailUrl);
		
		if(ret == -1) {
			throw new ServletException("Error Registering App " + title);
		}
	}
	
	private void unregisterApplication(HttpServletRequest req, HttpServletResponse resp)
	throws ServletException {
		ServletContext ctx = getServletContext();
		
		String title = ctx.getServletContextName();
		
		boolean ret = cowebAdmin.unregisterApplication(req.getRemoteUser(), title);
		
		if(!ret) {
			throw new ServletException("Error Registering App " + title);
		}
	}
	
	private void updateSession(HttpServletRequest req, HttpServletResponse resp)
	throws ServletException {
		ServletContext ctx = getServletContext();
		String title = ctx.getServletContextName();
	}
	
	private void updateApplication(HttpServletRequest req, HttpServletResponse resp)
	throws ServletException {
	}
	
	private void deleteSession(HttpServletRequest req, HttpServletResponse resp)
	throws ServletException {
	}
}
