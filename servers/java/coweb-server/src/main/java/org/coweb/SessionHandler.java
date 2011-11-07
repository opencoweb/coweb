package org.coweb;

import java.util.ArrayList;
import java.util.Map;

import org.cometd.bayeux.server.BayeuxServer;
import org.cometd.bayeux.Message;
import org.cometd.bayeux.server.ServerSession;
import org.cometd.bayeux.server.ServerChannel;
import org.cometd.bayeux.server.ServerMessage;
import org.cometd.bayeux.server.ConfigurableServerChannel;

import java.security.MessageDigest;

public class SessionHandler implements ServerChannel.MessageListener {
    
    private String confKey = null;
    private boolean collab = true;
    private boolean cacheState = false;
    private String sessionId = null;
    private ServiceHandler serviceHandler = null;
    private BayeuxServer server = null;
    private SessionManager manager = null;
    private SessionHandlerDelegate delegate = null;
    private long order = 0;

	private String syncAppChannel = null;
	private String syncEngineChannel = null;
	private String rosterAvailableChannel = null;
	private String rosterUnavailableChannel = null;
	
	private String requestUrl = null;
	private String sessionName = null;

	private ArrayList<ServerSession> attendees = new ArrayList<ServerSession>();
    
	public SessionHandler(String confkey,
            boolean collab,
            boolean cacheState,
            SessionHandlerDelegate delegate,
            UpdaterTypeMatcher updaterTypeMatcher) {
	
		this(confkey, collab, cacheState, delegate, updaterTypeMatcher, true);
	}
	
    public SessionHandler(String confkey,
            boolean collab,
            boolean cacheState,
            SessionHandlerDelegate delegate,
            UpdaterTypeMatcher updaterTypeMatcher,
			boolean appendSessionIdToChannel) {

        this.collab = collab;
        this.cacheState = cacheState;
        this.confKey = confkey;
        this.sessionId = hashURI(confkey);
        this.serviceHandler = new ServiceHandler(this.sessionId);
        this.delegate = delegate;

        this.manager = SessionManager.getInstance();
        this.server = this.manager.getBayeux();
		
		if(appendSessionIdToChannel == true) {
			this.syncAppChannel = "/session/"+this.sessionId+"/sync/app";
			this.syncEngineChannel = "/session/"+this.sessionId+"/sync/engine";
			this.rosterAvailableChannel = "/session/"+this.sessionId+"/roster/available";
			this.rosterUnavailableChannel = "/session/"+this.sessionId+"/roster/unavailable";

		}
		else {
			this.syncAppChannel = "/session/sync/app";
			this.syncEngineChannel = "/session/sync/engine";
			this.rosterUnavailableChannel = "/session/roster/unavailable";
			this.rosterAvailableChannel = "/session/roster/available";
		}
		
		ServerChannel.Initializer initializer = new ServerChannel.Initializer()
        {
            @Override
            public void configureChannel(ConfigurableServerChannel channel)
            {
                channel.setPersistent(true);
                channel.setLazy(false);
            }
        };
        this.server.createIfAbsent(this.syncAppChannel, initializer);
        this.server.createIfAbsent(this.syncEngineChannel, initializer);
		
        ServerChannel sync = server.getChannel(this.syncAppChannel);
        sync.addListener(this);
        sync = server.getChannel(this.syncEngineChannel);
        sync.addListener(this);
		

        this.delegate.init(this, cacheState, updaterTypeMatcher);
    }

	public String getRequestUrl() {
		return this.requestUrl;
	}
	
	public void setRequestUrl(String url) {
		this.requestUrl = url;
	}
	
	public String getSessionName() {
		return this.sessionName;
	}
	
	public void setSessionName(String name) {
		this.sessionName = name;
	}
	
    public ServiceHandler getServiceHandler() {
        return this.serviceHandler;
    }

    public SessionManager getSessionManager() {
        return this.manager;
    }

	public SessionHandlerDelegate getDelegate() {
		return this.delegate;
	}
	
	public ArrayList<ServerSession> getAttendees() {
		return this.attendees;
	}
	
	public String getRosterAvailableChannel() {
		return this.rosterAvailableChannel;
	}

	public String getRosterUnavailableChannel() {
		return this.rosterUnavailableChannel;
	}
	
    public boolean onMessage(ServerSession from, ServerChannel channel,
            ServerMessage.Mutable message) {
        //System.out.println("SessionHandler::onMessage");
		//System.out.println("session id = " + this.sessionId);
        //System.out.println(message.getJSON());
        
        Integer siteId = (Integer)from.getAttribute("siteid");
		//System.out.println(siteId);
		
		String msgSessionId = (String)from.getAttribute("sessionid");
		//System.out.println("msgSessionId = " + msgSessionId);
		if(!msgSessionId.equals(this.sessionId)) {
			return true;
		}
    	
        Map<String, Object> data = message.getDataAsMap();
        data.put("siteId", siteId);

        if(this.delegate.onSync(from, message)) {
            String channelName = message.getChannel();
            if(channelName.equals(this.syncAppChannel)) {
                // put total order on message
                data.put("order", this.order++);
                // forward app sync events to bots, not engine
                try {
                     this.serviceHandler.forwardSyncEvent(from, message);
                }
                catch(Exception e) { e.printStackTrace(); }
            }
        } else {
			return false;
		}
        
        return true;
    }
    

    public void onPublish(ServerSession remote, Message message) {
        //System.out.println("SessionHandler::onPublish");
        //System.out.println(message.getJSON());
        
        String channel = message.getChannel();
        try {
            if(channel.startsWith("/service/bot")) {
                this.delegate.onServiceRequest(remote, message);
            }
            else if(channel.equals("/service/session/updater")) {
                this.delegate.onUpdaterSendState(remote, message);
            }
        }
        catch(Exception e) {
            e.printStackTrace();
        }
    }
    
    public void onSubscribe(ServerSession serverSession, Message message) {
        //System.out.println("SessionHandler::onSubscribe");
        //System.out.println(channel);
        
        String channel = (String)message.get(Message.SUBSCRIPTION_FIELD);
        if(channel.equals("/service/session/join/*")) {
            this.delegate.onClientJoin(serverSession, message);
        }
        else if(channel.startsWith("/service/bot")) {
            this.delegate.onSubscribeService(serverSession, message);
        }
        else if(channel.startsWith("/bot")) {
            this.delegate.onSubscribeService(serverSession, message);
        }
        else if(channel.endsWith("/session/updater")) {
			this.attendees.add(serverSession);
            this.delegate.onUpdaterSubscribe(serverSession, message);
        }
    }
    
    public void onUnsubscribe(ServerSession serverSession, Message message) {
        // System.out.println("SessionHandler::onUnsubscribe");
        String channel = (String)message.get(Message.SUBSCRIPTION_FIELD);
        // System.out.println(channel);
        if(channel.startsWith("/service/bot")) {
            this.delegate.onUnsubscribeService(serverSession, message);
        }
        else if(channel.startsWith("/bot")) {
            this.delegate.onUnsubscribeService(serverSession, message);
        }
        
        return;
    }

    public void onPurgingClient(ServerSession client) {
		this.attendees.remove(client);
        if(this.delegate.onClientRemove(client)) {
            this.endSession();
        }
    }
    
    public String toString() {
        StringBuffer sb = new StringBuffer();
        sb.append("{\"confkey\":");
        sb.append(this.confKey);
        sb.append(",\"sessionid\":");
        sb.append(this.sessionId);
        sb.append(",\"collab\":");
        sb.append(this.collab);
        sb.append("}");
        
        return sb.toString();
    }
            
    public String getConfKey() {
        return this.confKey;
    }
    
    public String getSessionId() {
        return this.sessionId;
    }
    
    public boolean isCollab() {
        return this.collab;
    }
    
    public boolean isCachingState() {
    	return this.cacheState;
    }

    public static String hashURI(String url) {
        
        String hash = null;
        
        try {
            String t = Long.toString(System.currentTimeMillis());
            url = url + t;
            byte[] bytes = url.getBytes("UTF-8");
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] digest = md.digest(bytes);
            
            StringBuffer sb = new StringBuffer();
            for (int i = 0; i < digest.length; i++) {
              sb.append(Integer.toString((digest[i] & 0xff) + 0x100, 16).substring(1));
            }
            
            hash = sb.toString();

        }
        catch(Exception e) { 
            hash = url;
        }
        
        return hash;
    }

    public void removeBadClient(ServerSession client) {
        return;
    }
    
    public void endSession() {
        System.out.println("SessionHandler::endSession ***********");
		
        ServerChannel sync = this.server.getChannel(this.syncAppChannel);
        sync.removeListener(this);

        sync = server.getChannel(this.syncEngineChannel);
        sync.removeListener(this);
		
        this.delegate.onEndSession();
        this.delegate = null;

        this.serviceHandler.shutdown();
        this.serviceHandler = null;

        SessionManager manager = SessionManager.getInstance();
        manager.removeSessionHandler(this);
    }
}