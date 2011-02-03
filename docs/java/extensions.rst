.. include:: /replace.rst
.. default-domain:: py
.. module:: org.coweb
   :synopsis: Java package containing a coweb server implementation.

Extension points
----------------

The optional admin servlet parameters in the coweb application deployment descriptor can name custom classes deriving from base classes in the :mod:`org.coweb` package. The optional broker parameter in a service bot configuration file can also name a custom class deriving from a base class in the same package. New implementations of these bases can define new methods of managing sessions and communicating with bots. Together, they represent points of extension on the coweb server.

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

Manging session events
~~~~~~~~~~~~~~~~~~~~~~

.. class:: SessionHandlerDelegate

   Formal interface with callbacks for important session events which an implementation can allow or deny.
   
   .. method:: init(SessionHandler sessionHandler) -> void
   
      The coweb server calls this method when a session starts.
      
      :param sessionHandler: :class:`org.coweb.SessionHandler` instance of the session
      
   .. method:: onClientJoin(ServerSession client, Message message) -> boolean

      The coweb server calls this method when a coweb application attempts to join a session.

      :param client: `org.cometd.bayeux.server.ServerSession`_ instance representing the client that sent the request
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

      :param client: `org.cometd.bayeux.server.ServerSession`_ instance representing the client that sent the request
      :param message: `org.cometd.bayeux.Message`_ instance representing the request message
      :return: True to allow the request to proceed, false to deny it

   .. method:: onSubscribeService(ServerSession client, Message message) -> boolean
   
      The coweb server calls this method when a coweb application attempts to subscribe to a service bot in a session.

      :param client: `org.cometd.bayeux.server.ServerSession`_ instance representing the client that sent the request
      :param message: `org.cometd.bayeux.Message`_ instance representing the subscribe message
      :return: True to allow the subscribe to proceed, false to deny it

   .. method:: onSync(ServerSession client, Message message) -> boolean
   
      The coweb server calls this method when a coweb application attempts to subscribe to a service bot in a session.

      :param client: `org.cometd.bayeux.server.ServerSession`_ instance representing the client that sent the request
      :param message: `org.cometd.bayeux.Message`_ instance representing the sync message
      :return: True to allow the sync to proceed, false to deny it
      
      .. note:: Denying the sending of a sync event **will** cause web application state to diverge!

   .. method:: onUnsubscribeService(ServerSession client, Message message) -> boolean

      The coweb server calls this method when a coweb application attempts to unsubscribe from a service bot in a session.

      :param client: `org.cometd.bayeux.server.ServerSession`_ instance representing the client that sent the request
      :param message: `org.cometd.bayeux.Message`_ instance representing the unsubscribe message
      :return: True to allow the unsubscribe to proceed, false to deny it
   
   .. method:: onUpdaterSendState(ServerSession client, Message message) -> boolean
   
      The coweb server calls this method when a coweb application attempts to respond to a request for full state in a session.

      :param client: `org.cometd.bayeux.server.ServerSession`_ instance representing the client that sent the request
      :param message: `org.cometd.bayeux.Message`_ instance representing the state message from the updater
      :return: True to forward the state to the joining application, false to drop the state
   
   .. method:: onUpdaterSubscribe(ServerSession client, Message message) -> boolean

      The coweb server calls this method when a coweb application attempts to become an updater in a session.

      :param client: `org.cometd.bayeux.server.ServerSession`_ instance representing the client that sent the request
      :param message: `org.cometd.bayeux.Message`_ instance representing the client that sent the request
      :return: True to allow the application as an updater, false to deny

Communicating with service bots
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. module:: org.coweb.bots.transport
   :synopsis: Java package defining the service bot transport interface and its default implementations.

.. class:: Transport

.. _org.cometd.server.DefaultSecurityPolicy: http://cometd.org/documentation/2.x/cometd-java/server/authorization
.. _org.cometd.bayeux.server.ServerSession: http://download.cometd.org/bayeux-api/org/cometd/bayeux/server/ServerSession.html
.. _org.cometd.bayeux.Message: http://download.cometd.org/bayeux-api/org/cometd/bayeux/Message.html