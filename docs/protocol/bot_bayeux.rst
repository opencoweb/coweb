.. reviewed 0.4
.. include:: /replace.rst

Bot services over Bayeux
------------------------

The following sections detail the recommended protocol for communication between a service bot and a cooperative web server using Bayeux as a basis. The term *bot* used herein means the service bot implementation and its wrapper. The term *server* means the cooperative web server. The term *client* means a cooperative web application in the same session as the bot. All message bodies are in valid JSON format.

The message examples below show complete HTTP headers assuming use of Bayeux over XHR long-polling connections. In other uses of Bayeux (e.g., over WebSocket), the HTTP headers may be absent but the message bodies remain the same.

Session joining
~~~~~~~~~~~~~~~

A bot must join the session in which it will participant. The bot must initiate the join by following the `Bayeux protocol`_ starting with a handshake request to the Bayeux endpoint on the coweb server. Once the bot completes the Bayeux handshake, the bot must subscribe to its reserved private channel to receive messages from the session.

.. note::
   
   Any information the bot needs to connect to the server (e.g., the Bayeux URL, authentication credentials) are assumed to be passed to the bot out-of-band by its launcher. See :py:class:`coweb.service.launcher.ServiceLauncherBase` as an example.

Service bot subscribes to its private channel
#############################################

The bot must subscribe to the `/service/bot/service_name/*` Bayeux channel after completing the Bayeux handshake, where the `service_name` is known by the bot or passed to it out-of-band. Upon receiving and confirming this subscription, the coweb server must forward any messages it has queued to the bot.

::

   POST /service/id HTTP/1.1

   [{
      "channel" : "/meta/subscribe",
      "clientId" : "clientId",
      "subscription" : "/service/bot/service_name/*"
   }]

Session events
~~~~~~~~~~~~~~

After successfully completing the join procedure, the bot may begin to send and receive service events including client subscriptions, service requests, service responses, client operations, and shutdown requests.

Server sends client subscription notice to bot
##############################################

The server must notify the bot when any :ref:`client subscribes <proto-service-subscribe>` to the `/bot/service_name` channel reserved for bot broadcasts. The server must **not** send this notification when the client subscribes to the `/service/bot/service_name/response` channel reserved for private bot responses to the client.

::

   HTTP/1.1 200 OK
   Content-Type: application/json; charset=UTF-8

   [{
      "channel" : "/service/bot/service_name/subscribe",
      "data" : {
         "username" : "client username"
      }
   }]

Server sends client unsubscribe notice to bot
#############################################

The server must notify the bot when any  :ref:`client unsubscribes <proto-service-unsubscribe>` from the `/bot/service_name` channel reserved for bot broadcasts. The server should send this notification on behalf of a client that leaves the session without explicitly unsubscribing from the bot.

The server must **not** send this notification when the client unsubscribes from the `/service/bot/service_name/response` channel reserved for private bot responses to the client.

::

   HTTP/1.1 200 OK
   Content-Type: application/json; charset=UTF-8

   [{
      "channel" : "/service/bot/service_name/unsubscribe",
      "data" : {
         "username" : "client username"
      }
   }]

Server sends client request to bot
##################################

The server must forward any :ref:`client service request <proto-service-request>` to the bot providing that service. The server must forward the original `eventData` unchanged. The server must include the authenticated `username` of the requesting client to the `data` field of the message. The server must also include and track a unique `id` on the message to pair a later bot response with the requesting client.

::

   HTTP/1.1 200 OK
   Content-Type: application/json; charset=UTF-8

   [{
      "channel" : "/service/bot/service_name/request",
      "data" : {
         "eventData" : { ... },
         "username" : "client username"
      },
      "id" : "request id"
   }]

Bot responds to a client request
################################

The bot may send a private response to any client that previously sent a private request. The response may include arbitrary bot `eventData`. The response must include the unique `id` from the client request. The server must send the :ref:`bot response <proto-service-response>` to the client that sent the request with the same `id` and that client alone.

::

   POST /session/id HTTP/1.1

   [{
      "channel" : "/service/bot/service_name/response",
      "clientId" : "clientId",
      "data" : { 
         "eventData" : { ... }
      },
      "id" : "request id"
   }]

Bot publishes data to a session
###############################

The bot may publish a message to all subscribers of its public channel. The response may include arbitrary bot `eventData`. The server must deliver the :ref:`bot broadcast <proto-service-broadcast>` to all subscribers of that channel.

::

   POST /session/id HTTP/1.1

   [{
      "channel" : "/bot/service_name",
      "clientId" : "clientId",
      "data" : {
         "eventData" : { ... }
      }
   }]

Server sends client operation to bot
####################################

The server may forward :ref:`client operations <proto-op>` in a session to a bot. The server must include the entire `data` field of the client operation message under the `syncData` field to the bot. The server must also include the `username` of the client that sent the operation.

::

   HTTP/1.1 200 OK
   Content-Type: application/json; charset=UTF-8

   [{
      "channel" : "/service/bot/service_name/sync",
      "data" : {
         "syncData" : { 
            "topic" : "topic",
            "eventData" : { ... }
         },
         "username" : "client username"
      }
   }]

Server sends shutdown request to bot
####################################

The server should send a notice to the bot when the bot should terminate itself gracefully (e.g., when the session is ending). The server may include a `timeout` field indicating how long the bot has to exit gracefully before the server forcibly terminates it. The bot should honor this request immediately when received. 

::

   HTTP/1.1 200 OK
   Content-Type: application/json; charset=UTF-8

   [{
      "channel" : "/service/bot/service_name/shutdown",
      "data" : {
         "timeout" : seconds
      }
   }]