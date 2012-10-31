.. reviewed 0.4
.. include:: /replace.rst

Moderator/Bot Tutorial with CoMap
---------------------------------

This tutorial demonstrates how the CoMap cowebx demo application uses the
moderator and a bot to

* Use the moderator to keep track of collaborative sync events. We keep track
  of the CoMap's pin drop locations.
* Use the moderator to communicate the synchronized pin drop locations to a bot.
* Use the bot to send artificially generated "visitor count" of each pin
  location to all browser clients.

We omit almost all of the details of how the CoMap widget actually works, and
instead we focus on details only related to how the moderator and bot interact.

There are three main components to this demonstration: (1) the moderator,
(2) the service bot, and (3) the CoMap JavaScript application.

The goal: Populating pin drops with visitor counts
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Suppose we start with aCoMap application that only synchronized map viewing
location and pin drops. What we would like to add to the application is the
ability to show a "visitor count" of each pin drop location.

Suppose that through our server is the only method to get the visitor counts.
In order to minimize bandwidth, we don't want each client to query the server
for each pin drop visitor count. Instead, we will have a service bot
periodically send visitor counts for all pin locations.

The service bot needs to know which locations to get visitor counts for, so we
will use the moderator (located on the server side) to gather synchronized pin
drop locations. The moderator will then send the bot an updated list of zip
counts every time the list is updated.

.. warning:: We can't send sync events (pin drop locations) to the service bot
   directly. Messages sent to the bot are not transformed by the operation
   engine, so the bot might have an unsynchronized list of locations. We must
   use the moderator, since the moderator gets transformed events.

Source code
~~~~~~~~~~~

The source code for the CoMap discused in this tutorial is available on GitHub.
The cowebx repository is tagged `comap-mod-bot-tut
<https://github.com/opencoweb/cowebx/tree/comap-mod-bot-tut>`__, and you can see
the source for `ZipModerator.java`_ and `ZipVisits.java`_ there.

The Moderator
~~~~~~~~~~~~~

The moderator has two jobs: (1) maintain a synchronized list of pin drop
locations and (2) keep the bot up to date on the locations. We accomplish
the first job with ``onSync``. We keep the bot up to date by sending it a
message on each sync event.

.. sourcecode:: java

    public void onSync(Map<String, Object> data) {
        String topic = (String)data.get("topic");
        if (topic == null)
        	return;

        if (topic.startsWith("coweb.sync.marker")) {
            /* Parse the topic field to find the item after
             * coweb.sync.marker. */
        	String[] seqs = topic.split("\\.");
        	String action = seqs[3];
        	String mid = seqs[4]; /* UUID of pin. */

        	if (action.equals("add") || action.equals("move")) {
                this.updateBot(mid, (Map<String, Object>)data.get("value"));
            }
        }
    }

    private void updateBot(String mid, Map<String, Object> value) {
        value.put("uuid", mid);
        this.collab.postService("zipvisits", value);
    }

The server invokes ``onSync`` each time a browser client updates the list of
pin drops, and gives the moderator the transformed event. We check that the
sync event was actually for a pin drop (coweb.sync.marker). We extract the
universally unique id (UUID) of the pin and call ``updateBot``.

``updateBot`` simply uses the `CollabInterface`_ to send the bot a private
message with ``postService``. As per the rules for using ``CollabInterface``,
we create and destroy the CollabInterface object when the session becomes
active and inactive, respectively.

.. sourcecode:: java

    public void onSessionEnd() {
        /* When the session ends (all clients leave), we must stop sending
         * the pin drop list to the bot. */
        this.collab = null;
        this.isReady = false;
    }

    public void onSessionReady() {
        /* When the session is ready, create a new CollabInterface, so we can
         * talk to the service bot. */
        this.collab = this.initCollab("comap");
        this.markers.clear();
        this.isReady = true;
    }

Restricting access to the bot
#############################

Although not strictly required, we would like to disallow browser clients
from sending the bot messages. We use the moderator to accomplish this.

.. sourcecode:: java

    public boolean canClientMakeServiceRequest(String svcName,
            ServerSession client, Message mesage) {
        /* Disallow the client from making service requests, since it is not
         * necessary anyway. */
        return false;
    }

    public boolean canClientSubscribeService(String svcName,
            ServerSession client, Message message) {
        /* Do allow the client to subscribe to the service, since this is how
         * the client will receive the visit count data. */
        return true;
    }

Service Bot
~~~~~~~~~~~

The service bot does two things: (1) listens for messages from the moderator to
know where the pin drop locations are and (2) send the browser clients visit
counts periodically.

.. note:: The visit counts for each location are artificially generated with a
   random number generator. In fact, the bot completely disregards the latitude
   and longitude of the pin drop locations.

First, we have the bot start a thread to run on a timer (every five seconds)
when the session becomes active (i.e. clients join) and stop the timer when
the session becomes inactive (i.e. all clients leave).

.. sourcecode:: java

	public void onShutdown() {
        if (null != this.timer) {
            this.timer.cancel();
            this.timer = null;
        }
	}

    /*
     * Called upon session startup.
     */
	public void init() {
        this.visits.clear();
        this.timer = new Timer();
        this.timer.scheduleAtFixedRate(new BotTimer(), 0, 5000);
	}

The ``BotTimer`` class is a thread that, when invoked, sends visit counts to
all subscribed browser clients. It also calls ``updateVisits`` to artificially
increase the visitor count of each location randomly.

.. sourcecode:: java

    private class BotTimer extends TimerTask {
        @Override
        public void run() {
            ZipVisits bot = ZipVisits.this;
            bot.updateVisits();
            bot.proxy.publish(bot, bot.visits);
        }
    }

The bot listens for messages from the moderator using the public ``onRequest``
method of the Bot interface. When called, the bot adds (or updates) the pin drop
visitor count with a random number generator. The bot uses its Proxy to reply
to the moderator with an acknowledgement response, although this is not strictly
necessary. We do it here only for demonstration purposes.

.. sourcecode:: java

    /*
     * Handle messages from the moderator. The moderator will send us marker
     * positions via this mechanism.
     */
	public synchronized void onRequest(Map<String, Object> params, String replyToken,
            String username) {

        String uuid = (String)params.get("uuid");

        int visitCount = this.getVisitCount(params);
        this.visits.put(uuid, visitCount);

        /* The reply token is used to uniquely identify which client sent the
         * message and to distinguish between multiple messages if the client
         * has sent more than one to this service. It must be considered
         * opaque and not be altered. */
        Map<String, Object> reply = new HashMap<String, Object>();
        reply.put("reply", "acknowledged");
        this.proxy.reply(this, replyToken, reply);
	}

CoMap Application
~~~~~~~~~~~~~~~~~

The CoMap application subscribes to the `zipvisits` service after the coweb
session becomes ready. It uses the ``onZipVisits`` callback to actually
update the UI with new visitor counts.

.. sourcecode:: javascript

        onCollabReady: function(info) {
            // store username for use by widgets
            this.username = info.username;
            this.collab.subscribeService("zipvisits", this, "onZipVisits");
        },
    
        onZipVisits: function(args) {
            var counts = args.value;
            for(var uuid in counts) {
                if(counts.hasOwnProperty(uuid)) {
                    var marker = this.map.getMarkerById(uuid);
                    marker._visitCount = args.value[uuid];
                }
            }
            // refresh the current info popup
            this.map.refreshInfoPop();
        }

We use the coweb JSON configuration file to tell the server to use our
moderator and bot. See the section "Configuring coweb options" in
:doc:`../java/deploy` for more information on the JSON configuration.

We set `moderatorIsUpdater` to false, since we still want browser cients
to be the updaters. We turn on `operationEngine`, since we use the moderator
to get transformed events. Lastly, we populate the bots array with our lone
bot, `zipvisits`.

.. sourcecode:: json

    {
        "moderatorIsUpdater": false,
        "sessionModerator": "org.coweb.example.ZipModerator",
        "operationEngine": true,
        "bots": [
            {
                "name": "Visit Count Service",
                "description": "Publish visitor count for pin drop locations.",
                "author": "Chris Cotter",
                "version": "1.0",
                "service": "zipvisits",
                "class": "org.coweb.example.ZipVisits"
            }
        ]
    } 

