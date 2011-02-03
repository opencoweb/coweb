.. include:: /replace.rst
.. default-domain:: py
.. module:: org.coweb
   :synopsis: Java package containing a coweb server implementation.

Extension points
----------------

The optional admin servlet parameters in the coweb application deployment descriptor can name custom classes deriving from base classes in the :mod:`org.coweb` package. The optional broker parameter in a service bot configuration file can also name a custom class deriving from a base class in the same package. New implementations of these bases can define new methods of managing sessions and communicating with bots. Together, they represent points of extension on the coweb server.

.. note:: 

   The interfaces for controlling session security, eventing, and bot transports are still in flux as of |version|. Be aware they may change up until 1.0.

The creation and use of new subclasses at these extension points requires:

#. The installation of the coweb Maven modules.
#. The configuration of the coweb admin servlet to use alternative security policy and/or session delegate classes.
#. The configuration of coweb bots to use an alternative transport class.

Revisit the sections about :doc:`deploy` and :doc:`bots` for assistance configuring deployment descriptors and bots.

Controlling session access
~~~~~~~~~~~~~~~~~~~~~~~~~~

.. class:: CowebSecurityPolicy
   
   Extends `org.cometd.server.DefaultSecurityPolicy`_ with one additional method controlling user access to the admin servlet. Overrides :meth:`canHandshake` to enable anonymous access to sessions.
   
   .. method:: canAdminRequest(String username, String key, boolean collab) -> boolean
   
      The coweb server calls this method when a coweb application attempts to prepare a session.
      
      :param username: Authenticated username of the requestor
      :param key: Key identifying the session from :js:func:`SessionInterface.prepareConference`.
      :param collab: Flag from :js:func:`SessionInterface.prepareConference` set to true if requesting a session supporting cooperative events, false if requesting a session supporting service bot calls only
      :return: True to allow preparation to continue, false to deny

Managing session events
~~~~~~~~~~~~~~~~~~~~~~~

.. class:: SessionHandlerDelegate

   Formal interface with callbacks for important session events which an implementation can allow or deny.
   
   .. method:: init(SessionHandler sessionHandler) -> void
   
      The coweb server calls this method when a session starts.
      
      :param sessionHandler: :class:`org.coweb.SessionHandler` instance of the session
      
   .. method:: onClientJoin(ServerSession client, Message message) -> boolean

      The coweb server calls this method when a coweb application attempts to join a session.

      :param client: `org.cometd.bayeux.server.ServerSession`_ instance representing the application that sent the message
      :param message: `org.cometd.bayeux.Message`_ instance representing the join message
      :return: True to allow the application to join, false to deny access
   
   .. method:: onClientRemove(ServerSession client) -> boolean
   
      The coweb server calls this method when a coweb application leaves a session.

      :param client: `org.cometd.bayeux.server.ServerSession`_ instance representing the client that sent the request
      :return: True if the implementation successfully removed the client, false if not

   .. method:: onEndSession() -> boolean
   
      The coweb server calls this method when the session ends.

   .. method:: onServiceRequest(ServerSession client, Message message) ->  boolean
   
      The coweb server calls this method when a coweb application attempts to send a private request to a service bot in a session.

      :param client: `org.cometd.bayeux.server.ServerSession`_ instance representing the application that sent the message
      :param message: `org.cometd.bayeux.Message`_ instance representing the request message
      :return: True to allow the request to proceed, false to deny it

   .. method:: onSubscribeService(ServerSession client, Message message) -> boolean
   
      The coweb server calls this method when a coweb application attempts to subscribe to a service bot in a session.

      :param client: `org.cometd.bayeux.server.ServerSession`_ instance representing the application that sent the message
      :param message: `org.cometd.bayeux.Message`_ instance representing the subscribe message
      :return: True to allow the subscribe to proceed, false to deny it

   .. method:: onSync(ServerSession client, Message message) -> boolean
   
      The coweb server calls this method when a coweb application attempts to subscribe to a service bot in a session.

      :param client: `org.cometd.bayeux.server.ServerSession`_ instance representing the application that sent the message
      :param message: `org.cometd.bayeux.Message`_ instance representing the sync message
      :return: True to allow the sync to proceed, false to deny it
      
      .. note:: Denying the sending of a sync event **will** cause web application state to diverge!

   .. method:: onUnsubscribeService(ServerSession client, Message message) -> boolean

      The coweb server calls this method when a coweb application attempts to unsubscribe from a service bot in a session.

      :param client: `org.cometd.bayeux.server.ServerSession`_ instance representing the application that sent the request
      :param message: `org.cometd.bayeux.Message`_ instance representing the unsubscribe message
      :return: True to allow the unsubscribe to proceed, false to deny it
   
   .. method:: onUpdaterSendState(ServerSession client, Message message) -> boolean
   
      The coweb server calls this method when a coweb application attempts to respond to a request for full state in a session.

      :param client: `org.cometd.bayeux.server.ServerSession`_ instance representing the application that sent the message
      :param message: `org.cometd.bayeux.Message`_ instance representing the state message from the updater
      :return: True to forward the state to the joining application, false to drop the state
   
   .. method:: onUpdaterSubscribe(ServerSession client, Message message) -> boolean

      The coweb server calls this method when a coweb application attempts to become an updater in a session.

      :param client: `org.cometd.bayeux.server.ServerSession`_ instance representing the application that sent the message
      :param message: `org.cometd.bayeux.Message`_ instance representing the subscribe message from the updater
      :return: True to allow the application as an updater, false to deny

Communicating with service bots
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. module:: org.coweb.bots.transport
   :synopsis: Java package defining the service bot transport interface and its default implementations.

.. class:: Transport

   Abstract base class for new transport implementations between coweb server and service bots. Instantiated per service bot instance per session.
   
   .. attribute:: bayeuxServer
   
      `org.cometd.bayeux.server.BayeuxServer`_ instance of the coweb server
   
   .. attribute:: botConfig
   
      :class:`java.util.Properties` object containing bot configuration options and metadata
   
   .. attribute:: serviceName
   
      String name of the service provided by the bot communicating via this transport
   
   .. attribute:: sessionId
   
      String unique ID of the session to which the transport is bridging its bot
   
   .. method:: init() -> boolean
   
      The coweb server calls this method when a session decides to launch a service bot using this transport.
      
      :return: True if initialization is successful, false if not
   
   .. method:: shutdown() -> boolean
   
      The coweb server calls this method when a session decides to shut down the service bot using this transport. The transport should notify its bot of the impending shutdown.
      
      :return: Currently unused
   
   .. method:: subscribeUser(ServerSession client, Message message, boolean pub) -> boolean
   
      The coweb server calls this method when a coweb application subscribes to the service bot using this transport. The transport should notify its bot of the subscription.
      
      :param client: `org.cometd.bayeux.server.ServerSession`_ instance representing the application that sent the message
      :param message: `org.cometd.bayeux.Message`_ instance representing the service subscription message
      :param pub: True if subscribing to the bot's public broadcast channel, false if subscribing to its private request channel 
      :except IOException: When the transport experiences a failure delivering the message
      :return: Currently unused

   .. method:: syncEvent(ServerSession client, Message message) -> boolean
   
      The coweb server calls this method when a coweb application sends a cooperative event to the session. The transport should notify its bot of the event.

      :param client: `org.cometd.bayeux.server.ServerSession`_ instance representing the application that sent the message
      :param message: `org.cometd.bayeux.Message`_ instance representing the cooperative event message
      :except IOException: When the transport experiences a failure delivering the message
      :return: Currently unused
   
   .. method:: unSubscribeUser(ServerSession client, Message message, boolean pub) -> boolean
   
      The coweb server calls this method when a coweb application unsubscribes from the service bot using this transport. The transport should notify its bot of the unsubscribe.

      :param client: `org.cometd.bayeux.server.ServerSession`_ instance representing the application that sent the message
      :param message: `org.cometd.bayeux.Message`_ instance representing the unsubscribe message
      :param pub: True if unsubscribing from the bot's public broadcast channel, false if unsubscribing from its private request channel 
      :except IOException: When the transport experiences a failure delivering the message
      :return: Currently unused
   
   .. method:: userRequest(ServerSession client, Message message) -> boolean

      The coweb server calls this method when a coweb application sends a private request to the service bot using this transport. The transport should notify its bot of the request.

      :param client: `org.cometd.bayeux.server.ServerSession`_ instance representing the application that sent the message
      :param message: `org.cometd.bayeux.Message`_ instance representing the request message
      :except IOException: When the transport experiences a failure delivering the message
      :return: Currently unused

.. _org.cometd.bayeux.server.BayeuxServer: http://download.cometd.org/bayeux-api/org/cometd/bayeux/server/BayeuxServer.html
.. _org.cometd.server.DefaultSecurityPolicy: http://cometd.org/documentation/2.x/cometd-java/server/authorization
.. _org.cometd.bayeux.server.ServerSession: http://download.cometd.org/bayeux-api/org/cometd/bayeux/server/ServerSession.html
.. _org.cometd.bayeux.Message: http://download.cometd.org/bayeux-api/org/cometd/bayeux/Message.html