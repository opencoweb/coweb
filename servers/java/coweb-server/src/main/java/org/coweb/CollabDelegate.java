/**
 * Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
 * Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
 */
package org.coweb;

import java.math.BigInteger;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

import org.cometd.bayeux.Message;
import org.cometd.bayeux.server.ServerMessage;
import org.cometd.bayeux.server.ServerSession;
import org.cometd.bayeux.server.ServerChannel;
import org.cometd.bayeux.server.ConfigurableServerChannel;
import org.cometd.bayeux.server.BayeuxServer;


public class CollabDelegate extends DefaultDelegate {

	private Map<String,ServerSession> updatees = 
        new HashMap<String, ServerSession>();

	private Map<String,List<String>> updaters = 
        new HashMap<String, List<String>>();

    /**
     * List of available siteids.  An index with a null value
     * is an available siteid, otherwise the slot is filled with
     * ServerSession's clientid.
     */
	private ArrayList<String> siteids = new ArrayList<String>(5);

	private Object[] lastState = null;

    /**
     * Map of bayeux client id to ServerSession
     */
	private Map<String,ServerSession> clientids = 
        new HashMap<String,ServerSession>();


    public CollabDelegate() {
        super();
        this.siteids.add(0, "reserved");
		for(int i=1; i<5; i++) {
			this.siteids.add(i, null);
		}	
    }

	public ServerSession getServerSessionFromSiteid(String siteStr) {
		ServerSession client = null;
		try {
			int siteid = Integer.valueOf(siteStr);
			String clientId = this.siteids.get(siteid);
			
			if(clientId == null)
				return null;
				
			return this.clientids.get(clientId);
		}
		catch (Exception e) { ; }
		
		return null;
	}

    @Override
    public boolean onSync(ServerSession client, Message message) {
        if(this.ensureUpdater(client)) {
            this.clearLastState();
        }
        else {
            //System.out.println("CollabDelegate::onSync remove bad client");
            this.sessionHandler.removeBadClient(client);
            return false;
        }

        return super.onSync(client, message);
    }

    @Override
    public void onClientJoin(ServerSession client, Message message) {
        System.out.println("CollabDelegate::onClientJoin *************");
		int siteId = this.getSiteForClient(client);
		
		if(siteId == -1) {
			siteId = this.addSiteForClient(client);
		}

		System.out.println("siteId = " + siteId);
		Map<Integer,String> roster = this.getRosterList(client);
		//ArrayList<Object>data = new ArrayList<Object>();
		Object[]data = new Object[0];
		
		//System.out.println("data = " + data);
		boolean sendState = false;
		
		Map<String, Object> ext = message.getExt();
		@SuppressWarnings("unchecked")
		Map<String, Object> cobwebData = (Map<String, Object>)ext.get("coweb");
		String updaterType = (String)cobwebData.get("updaterType");
		client.setAttribute("updaterType", updaterType);
        System.out.println("updaterType = "+updaterType);
		
		if(this.updaters.isEmpty()) {
			this.addUpdater(client, false);
			sendState = true;
		}
		else if(this.lastState == null) {
			this.assignUpdater(client, updaterType);
			sendState = false;
		}
		else {
			data = this.lastState;
			sendState = true;
		}
		
		client.batch(new BatchUpdateMessage(client,
				data,
				roster,
				siteId,
			    sendState));
    }

    @Override
    public void onUpdaterSendState(ServerSession client, Message message) {
        String clientId = client.getId();
		Map<String, Object> data = message.getDataAsMap();
		
		String token = (String)data.get("token");
		if(token == null) {
            this.sessionHandler.removeBadClient(client);
			return;
        }
		
		List<String> tokens = this.updaters.get(clientId);
		if(tokens == null) {
            this.sessionHandler.removeBadClient(client);
			return;
        }
		
		if(!tokens.remove(token)) {
            this.sessionHandler.removeBadClient(client);
			return;
		}
		
		ServerSession updatee = this.updatees.get(token);
		if(updatee == null)
			return;
		
		this.updatees.remove(token);
		if (this.cacheState) {
			this.lastState = (Object[])data.get("state");
		}
		
		ServerMessage.Mutable msg = this.sessionManager.getBayeux().newMessage();

		msg.setChannel("/service/session/join/state");
		if (this.cacheState) {
			msg.setData(this.lastState);
		} else {
			msg.setData((Object[])data.get("state"));
		}
		msg.setLazy(false);
			
		updatee.deliver(this.sessionManager.getServerSession(), msg);
    }

    @Override
    public void onUpdaterSubscribe(ServerSession client, Message message) {
        this.addUpdater(client, true);
    }

    /**
     * returns true if this was the last updater.
     */
    @Override
    public boolean onClientRemove(ServerSession client) {

        System.out.println("CollabDelegate::onClientRemove ********");
        System.out.println("siteId = " + client.getAttribute("siteid"));
        super.onClientRemove(client);

        this.removeUpdater(client);
		if(this.getUpdaterCount() == 0) {
            System.out.println("removing last updater, ending coweb session");
            return true;
        }

        return false;
    }

    @Override
	public boolean onEndSession() {
		this.updatees.clear();
		this.updaters.clear();
		this.siteids.clear();
		this.lastState = null;
		this.clientids.clear();

        return true;
	}

    private void addUpdater(ServerSession serverSession, boolean notify) {
		String clientId = serverSession.getId();
		
		//check if this client is already an updater and ignore unless this is
        //the first updater
		if(this.updaters.containsKey(clientId) && !this.updaters.isEmpty()) {
			return;
		}
		
		//serverSession.setAttribute("username", clientId);
		//System.out.println("adding " + clientId + " to list of updaters");
		this.updaters.put(clientId, new ArrayList<String>());
		
		if(notify) {
			this.sendRosterAvailable(serverSession);
		}
	}
	
	private void sendRosterAvailable(ServerSession client) {
        //System.out.println("CollabSessionHandler::sendRosterAvailable");
        /* create channel */
        BayeuxServer server = this.sessionManager.getBayeux();
		ServerChannel.Initializer initializer = new ServerChannel.Initializer()
        {
            @Override
            public void configureChannel(ConfigurableServerChannel channel)
            {
                channel.setPersistent(true);
            }
        };
        
        server.createIfAbsent("/session/roster/available", initializer);
        ServerChannel channel = server.getChannel("/session/roster/available");
        if(channel == null) {
            //System.out.println("channel is null shit");
            return;
        }

		ServerSession from = this.sessionManager.getServerSession();
		
		Integer siteId = (Integer)client.getAttribute("siteid");
        String username = (String)client.getAttribute("username");

		Map<String, Object> data = new HashMap<String,Object>();
        data.put("siteId", siteId);
        data.put("username", username);

        //System.out.println(data);
		
		channel.publish(from, data, null);
	}
	
	private void sendRosterUnavailable(ServerSession client) {
	    //System.out.println("CollabSessionHandler::sendRosterAvailable");
        /* create channel */
        BayeuxServer server = this.sessionManager.getBayeux();
		ServerChannel.Initializer initializer = new ServerChannel.Initializer()
        {
            @Override
            public void configureChannel(ConfigurableServerChannel channel)
            {
                channel.setPersistent(true);
            }
        };
        
        server.createIfAbsent("/session/roster/unavailable", initializer);
        ServerChannel channel = server.getChannel("/session/roster/unavailable");
        if(channel == null) {
            //System.out.println("channel is null shit");
            return;
        }

		ServerSession from = this.sessionManager.getServerSession();
		
		Integer siteId = (Integer)client.getAttribute("siteid");
        String username = (String)client.getAttribute("username");

		Map<String, Object> data = new HashMap<String,Object>();
        data.put("siteId", siteId);
        data.put("username", username);

        //System.out.println(data);
		
		channel.publish(from, data, null);
	}
	
	public String toString() {
		return "CollabSessionHandler";
	}
	
	private int getSiteForClient(ServerSession client) {
		if(this.siteids.contains(client.getId())) {
			return this.siteids.indexOf(client.getId());
		}
		
		return -1;
	}
	
	private int addSiteForClient(ServerSession client) {
		
		int index = this.siteids.indexOf(null);
		if(index == -1) {
			index = this.siteids.size();
			this.siteids.ensureCapacity(this.siteids.size() + 1);
			this.siteids.add(index, client.getId());
		}
		else
			this.siteids.set(index, client.getId());
		
		client.setAttribute("siteid", new Integer(index));
		this.clientids.put(client.getId(), client);
		
		return index;
	}
	
	private int removeSiteForClient(ServerSession client) {

        if(client == null) {
            System.out.println("CollabDelegate::removeSiteForClient ******* client is null *******");
            return -1;
        }

        int siteid = this.siteids.indexOf(client.getId());
        if(siteid == -1) {
            System.out.println("CollabDelegate::removeSiteForClient ****** Cannot find client in siteids list *******");
            Integer i = (Integer)client.getAttribute("siteid");
            if(i == null) {
                System.out.println("******* Client Does not have siteId attribute - Ghost *******");
            }
            return -1;
        }

		this.siteids.set(siteid, null);
		return siteid;
	}
	
	private Map<Integer, String> getRosterList(ServerSession client) {
		
		Map<Integer, String> roster = new HashMap<Integer,String>();
		
		for(String clientId : this.updaters.keySet()) {
			ServerSession c = this.clientids.get(clientId);
			Integer siteId = (Integer)c.getAttribute("siteid");
			roster.put(siteId, (String)c.getAttribute("username"));
		}
	
		return roster;
	}
	
	private void assignUpdater(ServerSession updatee, String updaterType) {
        System.out.println("CollabDelegate::assignUpdater *****************");
		ServerSession from = this.sessionManager.getServerSession();
		if(this.updaters.isEmpty()) {
			this.addUpdater(updatee, false);
			
			updatee.deliver(from, 
					"/service/session/join/state",
					new ArrayList<String>(),
					null);
			
			return;		
		}
		
		String updaterId = null;
		ServerSession updater = null;
		if (!updaterType.equals("default")) {
			String matchedType = updaterTypeMatcher.match(updaterType, getAvailableUpdaterTypes());
			if (matchedType != null) {
				for (String id : this.updaters.keySet()) {
					updater = this.clientids.get(id);
					if (updater.getAttribute("updaterType").equals(matchedType)) {
						updaterId = id;
				        System.out.println("found an updater type matched to ["+matchedType+"]");
						break;
					}
				}
			}
		}
		if (updaterId == null) {
			Random r = new Random();
			int idx = r.nextInt(this.updaters.size());
	        System.out.println("using default updater type");
			Object[] keys = this.updaters.keySet().toArray();
			updaterId = (String)keys[idx];
			updater = this.clientids.get(updaterId);
		}
        System.out.println("assigning updater " + updater.getAttribute("siteid") + " to " + updatee.getAttribute("siteid"));    
		SecureRandom s = new SecureRandom();
		String token = new BigInteger(130, s).toString(32);
		
		//.println("found updater " + updaterId);
		(this.updaters.get(updaterId)).add(token);
		this.updatees.put(token, updatee);
		
		updater.deliver(from,
				"/service/session/updater",
				token,
				null);
	}
	
	private boolean ensureUpdater(ServerSession serverSession) {
		return this.updaters.containsKey(serverSession.getId());
	}

    private void clearLastState() {
		this.lastState = null;
	}
	
	private void removeUpdater(ServerSession client) {
        //System.out.println("CollabDelegate::removeUpdater " + client);
		this.removeSiteForClient(client);
		
		List<String> tokenList = this.updaters.get(client.getId());
		this.updaters.remove(client.getId());
		if(tokenList == null) {
			for(String token: this.updatees.keySet()) {
				ServerSession updatee = this.updatees.get(token);
				if(updatee.getId().equals(client.getId())) {
					this.updatees.remove(token);
				}
			}
		}
		else {
			//System.out.println("sending roster unavailable");
			this.sendRosterUnavailable(client);
			if(!tokenList.isEmpty()) {
                //System.out.println("this updater was updating someone");
				for(String token: tokenList) {
					ServerSession updatee = this.updatees.get(token);
					if(updatee == null)
						continue;
					
					//this.updatees.remove(token);
					String updaterType = (String)client.getAttribute("updaterType");
					if (updaterType == null) {
						updaterType = "default";
					}
                    this.assignUpdater(updatee, updaterType);
				}
			}
		}
	}
	
	private int getUpdaterCount() {
		return this.updaters.size();
	}
	
	private List<String> getAvailableUpdaterTypes() {
		List<String> availableUpdaterTypes = new ArrayList<String>();
		for (String id : this.updaters.keySet()) {
			ServerSession updater = this.clientids.get(id);
			availableUpdaterTypes.add((String)updater.getAttribute("updaterType"));
		}
		return availableUpdaterTypes;
	}
	
	private class BatchUpdateMessage implements Runnable {
		
		private ServerSession client = null;
		private Object[] data = null;
		private Map<Integer,String> roster = null;
		private int siteId = -1;
		private boolean sendState = false;
		
		BatchUpdateMessage(ServerSession client,
				Object[] data,
				Map<Integer,String> roster,
				int siteId,
				boolean sendState) {
			this.client = client;
			this.data = data;
			this.roster = roster;
			this.siteId = siteId;
			this.sendState = sendState;
		}
				
		@Override
		public void run() {
			SessionManager manager = SessionManager.getInstance();
			ServerSession server = manager.getServerSession();
			
			this.client.deliver(server, "/service/session/join/siteid", this.siteId, null);
			this.client.deliver(server, "/service/session/join/roster", this.roster, null);
		
			if(this.sendState) {
				this.client.deliver(server, "/service/session/join/state", this.data, null);
			}
		}
	}
}
