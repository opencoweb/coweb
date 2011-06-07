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
    private String sessionId = null;
    private ServiceHandler serviceHandler = null;
    private BayeuxServer server = null;
    private SessionManager manager = null;
    private SessionHandlerDelegate delegate = null;
    private long order = 0;
    
    public SessionHandler(String confkey,
            boolean collab,
            SessionHandlerDelegate delegate) {

        this.collab = collab;
        this.confKey = confkey;
        this.sessionId = hashURI(confkey);
        this.serviceHandler = new ServiceHandler(this.sessionId);
        this.delegate = delegate;

        this.manager = SessionManager.getInstance();
        BayeuxServer server = this.manager.getBayeux();
        ServerChannel sync = server.getChannel("/session/sync/app");
        sync.addListener(this);
        sync = server.getChannel("/session/sync/engine");
        sync.addListener(this);

        this.delegate.init(this);
    }

    public ServiceHandler getServiceHandler() {
        return this.serviceHandler;
    }

    public SessionManager getSessionManager() {
        return this.manager;
    }

    public boolean onMessage(ServerSession from, ServerChannel channel,
            ServerMessage.Mutable message) {
        // System.out.println("SessionHandler::onMessage");
        // System.out.println(message.getJSON());
        
        Integer siteId = (Integer)from.getAttribute("siteid");
        Map<String, Object> data = message.getDataAsMap();
        data.put("siteId", siteId);

        if(this.delegate.onSync(from, message)) {
            String channelName = message.getChannel();
            if(channelName.equals("/session/sync/app")) {
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
        BayeuxServer server = this.manager.getBayeux();
        ServerChannel sync = server.getChannel("/session/sync/app");
        sync.removeListener(this);
        sync = server.getChannel("/session/sync/engine");
        sync.removeListener(this);

        this.delegate.onEndSession();
        this.delegate = null;

        this.serviceHandler.shutdown();
        this.serviceHandler = null;

        SessionManager manager = SessionManager.getInstance();
        manager.removeSessionHandler(this);
    }
}
