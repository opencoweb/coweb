.. reviewed 0.4
.. include:: /replace.rst
.. default-domain:: py
.. module:: org.coweb
   :synopsis: Java package containing a coweb server implementation.

Extension points
----------------

The optional admin servlet parameters in the coweb application deployment descriptor can name custom classes deriving from base classes in the :mod:`org.coweb` package. The optional broker parameter in a service bot configuration file can also name a custom class deriving from a base class in the same package. New implementations of these bases can define new methods of managing sessions, communicating with bots and controlling the type of updater selected for late joiners. Together, they represent points of extension on the coweb server.

The creation and use of new subclasses at these extension points requires:

#. The installation of the coweb Maven modules.
#. The configuration of the coweb admin servlet to use alternative security policy and/or session delegate classes.
#. The configuration of coweb bots to use an alternative transport class.
#. The configuration of an updater type matcher implementation used to select the type of updater for late joiners.

See the sections about :doc:`deploy` and :doc:`bots` for assistance configuring deployment descriptors and bots.

Controlling session access
~~~~~~~~~~~~~~~~~~~~~~~~~~

.. class:: CowebSecurityPolicy
   
   Extends `org.cometd.server.DefaultSecurityPolicy`_ with additional methods controlling user access to various coweb resources. The base class implementation allows anonymous access to all coweb resources.

   .. method:: canAdminRequest(String username, String key, boolean collab) -> boolean
   
      The coweb server calls this method when a coweb application attempts to prepare a session.
      
      :param username: Authenticated username of the requestor
      :param key: Key identifying the session from :js:func:`SessionInterface.prepare`.
      :param collab: Flag from :js:func:`SessionInterface.prepare` set to true if requesting a session supporting cooperative events, false if requesting a session supporting service bot calls only
      :return: True to allow preparation to continue, false to deny
            
   .. method:: canInvokeServiceRequest(String username, String sessionid, String serviceName) -> boolean

      The base class implementation of :meth:`canPublish` calls this method when a coweb application attempts to send a request to a service bot.
   
      :param username: Authenticated username of the requestor
      :param sessionid: Session in which the request was sent
      :param serviceName: Name of the service bot
      :return: True to allow the request, false to deny

   .. method:: canSubscribeOther(BayeuxServer server, ServerSession client, ServerChannel channel, ServerMessage message) -> boolean

      The base class implementation of :meth:`canSubscribe` calls this method when a coweb application attempts to subscribe to a channel other than the ones reserved for coweb messages.
      
      :param server: `org.cometd.bayeux.server.BayeuxServer`_ instance of the coweb server
      :param client: `org.cometd.bayeux.server.ServerSession`_ instance representing the application that sent the message
      :param channel: `org.cometd.bayeux.server.ServerChannel` instance representing the channel
      :param message: `org.cometd.bayeux.Message`_ instance representing the join message 
      :return: True to allow the subscribe, false to deny
   
   .. method:: canSubscribeService(String username, String sessionid, String serviceName) -> boolean

      The base class implementation of :meth:`canSubscribe` calls this method when a coweb application attempts to subscribe to a service bot.
      
      :param username: Authenticated username of the requestor
      :param sessionid: Session in which the request was sent
      :param serviceName: Name of the service bot
      :return: True to allow the request, false to deny
   
   .. method:: canSubscribeToSession(String username, String key, Boolean collab) -> boolean   
   
      The base class implementation of :meth:`canHandshake` calls this method when a coweb application attempts to join a session.

      :param username: Authenticated username of the requestor
      :param key: Key identifying the session from :js:func:`SessionInterface.prepare`.
      :param collab: Flag from :js:func:`SessionInterface.prepare` set to true if requesting a session supporting cooperative events, false if requesting a session supporting service bot calls only
      :return: True to allow the join, false to deny
      
      .. versionchanged:: 0.3

Detailed management
###################

A security policy allows custom approval or denial of important coweb behaviors without affecting the operation of the coweb server. Implementations of `org.coweb.SessionHandlerDelegate`_ enable more fine-grained control over the coweb protocol, but at the risk of impacting the proper operation of the coweb server.

For example, the default delegate, `org.coweb.CollabDelegate`_, controls the joining of new clients, the assignment of updaters, the forwarding of bot requests and responses, etc. A subclass can override methods in this delegate to customize these actions but must take care to invoke the base class methods properly to adhere to the coweb protocol.

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
   
   .. method:: subscribeUser(ServerSession client, Message message, boolean pub) -> void
   
      The coweb server calls this method when a coweb application subscribes to the service bot using this transport. The transport should notify its bot of the subscription.
      
      :param client: `org.cometd.bayeux.server.ServerSession`_ instance representing the application that sent the message
      :param message: `org.cometd.bayeux.Message`_ instance representing the service subscription message
      :param pub: True if subscribing to the bot's public broadcast channel, false if subscribing to its private request channel 
      :except IOException: When the transport experiences a failure delivering the message
      :return: Currently unused

   .. method:: syncEvent(ServerSession client, Message message) -> void
   
      The coweb server calls this method when a coweb application sends a cooperative event to the session. The transport should notify its bot of the event.

      :param client: `org.cometd.bayeux.server.ServerSession`_ instance representing the application that sent the message
      :param message: `org.cometd.bayeux.Message`_ instance representing the cooperative event message
      :except IOException: When the transport experiences a failure delivering the message
   
   .. method:: unsubscribeUser(ServerSession client, Message message, boolean pub) -> void
   
      The coweb server calls this method when a coweb application unsubscribes from the service bot using this transport. The transport should notify its bot of the unsubscribe.

      :param client: `org.cometd.bayeux.server.ServerSession`_ instance representing the application that sent the message
      :param message: `org.cometd.bayeux.Message`_ instance representing the unsubscribe message
      :param pub: True if unsubscribing from the bot's public broadcast channel, false if unsubscribing from its private request channel 
      :except IOException: When the transport experiences a failure delivering the message
   
   .. method:: userRequest(ServerSession client, Message message) -> void

      The coweb server calls this method when a coweb application sends a private request to the service bot using this transport. The transport should notify its bot of the request.

      :param client: `org.cometd.bayeux.server.ServerSession`_ instance representing the application that sent the message
      :param message: `org.cometd.bayeux.Message`_ instance representing the request message
      :except IOException: When the transport experiences a failure delivering the message

Controlling the type of Updater assigned to late joiners
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. class:: UpdaterTypeMatcher

   Interface called when a Delegate implementation needs to match an Updater Type for a late joiner.

   .. method:: match(String updaterType, List<String> availableUpdaterTypes) -> String

      :param updaterType: Type of updater of the updatee
      :param availableUpdaterTypes: List of available updater types
      :return: Matched type otherwise null to indicate no match is available