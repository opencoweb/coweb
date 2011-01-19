.. include:: /replace.rst

.. highlight:: js

Cooperative events over Bayeux
------------------------------

The following sections details the procedure a cooperative web application must follow to prepare, join, and participate in a coweb session hosted by a coweb server. The term *client* used herein means the cooperative web application including any client-side components from the coweb framework, the collective *application* and *client* layers described in the :doc:`framework architecture </intro/arch>` section. The term *server* means the cooperative web server. All message bodies are in valid JSON format.

Session preparation
~~~~~~~~~~~~~~~~~~~

A client must prepare a Bayeux session before entering it. The prepare phase requires a single XHR request and response.

Client requests access to session
#################################

The client must POST a prepare request to the coweb server admin handler. The request must include the `key` identifying the session to enter and whether the client expects the session to be collaborative or not.

The URL of the admin handler may vary based on the configuration of the coweb server. The client must POST to the correct URL.

::

   POST /admin HTTP/1.1

   {
      "key" : "key",
      "collab" : true/false
   }

Admin reports session details
#############################

The admin handler must indicate the successful preparation of a session by returning information about the session. The response must include the `sessionurl` to which a client should send a `Bayeux handshake request`_ to join the sesession, a `sessionid` uniquely identifying the session, the `key` sent by the client, and the `collab` flag indicating if the session is collaborative or not regardless of what the client requested. 

The response should include the authenticated `username` associated with the client. The response may include an `info` object containing arbitrary values defined by the server or its application-specific extensions.

The response HTTP status should be 201 when session is first created and 200 when it already exists.

::

   HTTP/1.1 200 OK
   Content-Type: application/json; charset=UTF-8

   {
      "sessionurl" : "/path/of/session"
      "sessionid" : "unique session id",
      "username" : "authed username",
      "key" : "key",
      "collab" : true/false,
      "info" : {
         ...
      }
   }

Admin reports session failure
#############################

The admin handler must indicate a failure to prepare a session by returning information about the session and error. The response must include the `key` and `collab` flag sent by the client. The response should include an `error` description for human consumption.

The response HTTP status should be any appropriate HTTP error for programmatic use.

::

   HTTP/1.1 403 Not Authorized
   Content-Type: application/json; charset=UTF-8

   {
      "key" : "key",
      "collab" : true/false,
      "error" : "error tag"
   }

Session joining
~~~~~~~~~~~~~~~

After successfully preparing a session, a client may proceed to join the session. A client must initiate the join by following the `Bayeux protocol`_ starting with a handshake request. The client and server must both agree to support the *ack* extension during the Bayeux handshake to guarantee a total ordering for cooperative web events. A client must proceed to the following steps to bring its coweb state up-to-date once it completes the handshake and receives a valid Bayeux client ID from the server.

The URL of the session handler is determined by the `sessionurl` value in the session preparation response from the admin handler.

Client subscribes to session topics
###################################

The client must subscribe to the `/session/roster/*`, `/session/sync`, and `/service/session/join/*` Bayeux channels after completing the Bayeux handshake. The first two subscriptions ensure receipt of roster changes and cooperative events. The third initiates the update procedure if the client is joining a session already in progress.

The client must queue all messages received on the `/session/roster` and `/session/sync` channels until it receives and processes a copy of the current application state on the `/service/session/join/state` channel. This queue guarantees no events are missed while the client completes the join procedure.

::

   POST /path/to/session/handler HTTP/1.1

   [{
      "channel" : "/meta/subscribe",
      "clientID" : "clientId",
      "subscription" : "/session/roster/*"
   },
   {
      "channel" : "/meta/subscribe",
      "clientID" : "clientId",
      "subscription" : "/session/sync"
   },
   {
      "channel" : "/meta/subscribe",
      "clientId" : "clientId",
      "subscription" : "/service/session/join/*"
   }]

Server sends site ID and roster to any joiner
#############################################

The server must assign a joining client the lowest available integer site ID immediately upon the client's subscription to `/service/session/join/*`. The server must also send a client the complete roster of session participants mapping their assigned site IDs to their authenticated usernames upon the same subscription. 

::

   HTTP/1.1 200 OK
   Content-Type: application/json; charset=UTF-8

   [{
      "channel" : "/service/session/join/siteid",
      "data" : 1
   },
   {
      "channel" : "/service/session/join/roster",
      "data" : {
            siteIdInt1 : "username 1",
            siteIdInt2 : "username 2",
            ...
      }
   }]
   
Server sends empty state to first joiner
########################################

The server must send the first client to join a session an empty state message immediately upon the client's subscription to `/service/session/join/*`. If the last client in a session leaves while another is attempting to join, the server should treat the joining client as the first to join the session and send the empty state message.

::

   [{
      "channel" : "/service/session/join/state",
      "data" : null
   }]

Server contacts updater for state
#################################

The server must send a request for application state to an *updater* client when a new client joins a session in-progress. The server must include a `token` in the state request to pair with and confirm a later state response.

The server should take steps to speed this process to ensure joining clients are updated quickly. For example, a server may attempt to cache a valid copy of the application state, contact multiple updaters and use the state from the one that responds fastest, or try to balance the request load across updaters.

If an updater fails to respond, the server should contact another updater for state and kick the unresponsive updater from the session. If no updaters remain, the server should appoint any one client currently joining as an updater by sending it empty state. The newly appointed updater can server as an updater for other joining clients.

::

   HTTP/1.1 200 OK
   Content-Type: application/json; charset=UTF-8

   [{
      "channel" : "/service/session/updater",
      "data" : {
         "token" : "key"
      }
   }]

Updater sends state to server
#############################

An updater client must respond to a state request from the coweb server by sending enough information for a joining client to reconstruct the application state and begin participation in operational transformation. The response must include the `token` the server provided in the original request for state. The state format should be an array of objects with `topic` and `value` attributes indicating what part of the application state is sent. The values are for these attributes are application-defined.

The operation engine on the updater site must include its state as part of this response to seed the joining client's engine. The operation engine state should have topic `coweb.engine.state` for consistency across implementations.

::

   POST /path/to/session/handler HTTP/1.1

   [{
      "channel" : "/service/session/updater",
      "clientId" : "clientId",
      "data" : {
         "token" : "key",
         "state" : [ 
            {
               "topic" : "topic 1",
               "value" : "value 1"
            },
            {
               "topic" : "topic 2",
               "value" : "value 2"
            },
            ...
         ]
      }
   }]

Server sends state to late joining client
#########################################

A server must forward the current application state to a client joining a session in-progress. A client must apply the received state to its application and operation engine. After applying the state, the client must process any queued events from the `/session/roster` and `/session/sync` channel subscriptions to finish bringing the application up to date. Only after this step should a client allow a user to make changes to its state.

::

   HTTP/1.1 200 OK
   Content-Type: application/json; charset=UTF-8

   [{
      "channel" : "/service/session/join/state",
      "data" : [ ... ]
   }]

Joining client gives notice of availability as updater
######################################################

To complete the joining procedure, the joining client must subscribe to the `/service/session/updater` channel to receive state requests from future joining clients. The server must consider the client an updater after receiving this subscription.

::

   POST /path/to/session/handler HTTP/1.1

   [{
      "channel" : "/meta/subscribe",
      "clientId" : "clientId",
      "subscription" : "/service/session/updater"
   }]

Session events
~~~~~~~~~~~~~~

After successfully completing the join procedure, the client may begin to send and receive session events including roster changes, operations on application state, and service bot requests and responses.

Roster changes
##############

The server must notify all clients in a session of newly appointed updaters as well as updaters leaving the session. The client should use these notifications plus the initial user list it received while joining to maintain a local roster of all users in a session.

Server sends notice of new updater
``````````````````````````````````

::

   HTTP/1.1 200 OK
   Content-Type: application/json; charset=UTF-8

   [{
      "channel" : "/session/roster/available",
      "data" : {
           "siteId" : siteIdInt,
           "username" : "username"
      }
   }]

Server sends notice of leaving updater
``````````````````````````````````````

::

   HTTP/1.1 200 OK
   Content-Type: application/json; charset=UTF-8

   [{
      "channel" : "/session/roster/unavailable",
      "data" : {
            "siteId" : siteIdInt,
            "username" : "username"
      }
   }]

Client operations
#################

Client publishes an operation
`````````````````````````````

The client must send operations that affect the shared application state to the server. The operation must contain a `topic` indicating the portion of the application affected (e.g., which widget) and `eventData` describing the change for operational transformation by other clients.

The structure of `eventData` is unspecified to support arbitrary data types and different operational transformation algorithms. For compatibility with the current coweb framework implementation, `eventData` should contain the `value`, `type`, `position`, and `context` attributes used by the :doc:`operation engine </intro/openg>`.

::

   POST /path/to/session/handler HTTP/1.1

   [{
      "channel" : "/session/sync",
      "clientId" : "clientId",
      "data" : {
         "topic" : "topic",
         "eventData" : { ... }
      }
   }]

Server delivers an operation
````````````````````````````

The server must insert the site ID of the client into the `data` field of any operation the client sends before publishing it to the `/session/sync` channel for other clients.

::

   HTTP/1.1 200 OK
   Content-Type: application/json; charset=UTF-8

   [{
      "channel" : "/session/sync",
      "data" : {
         "siteId" : siteId,
         "topic" : "topic",
         "eventData" : { ... }
      }
   }]

Service requests, responses, and broadcasts
###########################################

Client subscribes to service responses
``````````````````````````````````````

The client should subscribe to the `/service/bot/service_name/response` channel if the client intends to send requests to the bot providing the `service_name` service. The client must send this subscription before sending any requests to the service bot.

::

   POST /path/to/session/handler HTTP/1.1

   [{
      "channel" : "/meta/subscribe",
      "clientId" : "clientId",
      "subscription" : "/service/bot/service_name/response"
   }]

Client subscribes to service broadcasts
```````````````````````````````````````

The client may subscribe to the `/bot/service_name` channel if it wishes to receive broadcasts messages from the bot providing the `service_name` service.

::

   POST /path/to/session/handler HTTP/1.1

   [{
      "channel" : "/meta/subscribe",
      "clientId" : "clientId",
      "subscription" : "/bot/service_name"
   }]

Client unsubscribes from responses or broadcasts
````````````````````````````````````````````````

The client may unsubscribe from the `/service/bot/service_name/response` or `/bot/service_name` channels if it no longer wishes to receive such notifications from the bot providing the `service_name` service.

::

   POST /path/to/session/handler HTTP/1.1

   [{
      "channel" : "/meta/unsubscribe",
      "clientId" : "clientId",
      "subscription" : "/response/or/broadcast/channel"
   }]

Client sends a service requests
```````````````````````````````

The client may publish a request to the `/service/bot/service_name/request` channel to send data to the bot providing the `service_name` service. The `topic` field should be unique among all outstanding requests to this bot from this client for pairing with a later response on the `/service/bot/service_name/response` channel.

::

   POST /path/to/session/handler HTTP/1.1

   [{
      "channel" : "/service/bot/service_name/request",
      "clientId" : "clientId",
      "data" : {
         "topic" : "request topic",
         "eventData" : { ... }
      }
   }]

Server forwards a service response
``````````````````````````````````

The server must send a bot response to the requesting client alone on the `/service/bot/service_name/response` channel. The `topic` attribute must match the one from the original client request. The `eventData` property may contain arbitrary data from the bot.

The server must avoid sending any bot response to a client that does not have an outstanding request. The server must ensure the bot is responding on its own channel and no other.

::

   HTTP/1.1 200 OK
   Content-Type: application/json; charset=UTF-8

   [{
      "channel" : "/service/bot/service_name/response",
      "data" : {
         "topic" : "request topic",
         "eventData" : { ... }
      }
   }]

Server forwards a service broadcast
```````````````````````````````````

The server must send a bot broadcast to all clients subscribed to the `/bot/service_name`. The `eventData` property may contain arbitrary data from the bot.

The server must ensure the bot is broadcasting on its own channel and no other.

::

   HTTP/1.1 200 OK
   Content-Type: application/json; charset=UTF-8

   [{
      "channel" : "/bot/service_name",
      "data" : {
         "eventData" : { ... }
      }
   }]

.. _Bayeux handshake request: http://svn.cometd.com/trunk/bayeux/bayeux.html#toc_49
.. _Bayeux protocol: http://svn.cometd.com/trunk/bayeux/bayeux.html