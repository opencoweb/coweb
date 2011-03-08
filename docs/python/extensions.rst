.. include:: /replace.rst
.. default-domain:: py

Extension points
----------------

The various manager classes specified in a :class:`coweb.AppContainer` derive from abstract base classes representing extension points in the :mod:`coweb` package. New implementations of these base classes can define new methods of authenticating users, controlling session access, launching bots, and communicating with bots.

The creation and use of new managers requires:

#. The installation of the :mod:`coweb` package into the Python import path.
#. The import of the new manager module into an application container script.
#. The configuration of an application container to use the new manager instead of its default.

Revisit the section about :doc:`container` for assistance configuring a coweb server to use third-party managers.

Authenticating users
~~~~~~~~~~~~~~~~~~~~

.. module:: coweb.auth
   :synopsis: Python package defining the authentication manager interface and its default implementations.

.. class:: AuthBase

   Controls user authentication with the coweb server. A subclass must implement all of the methods in the base.

   .. method:: requires_login(self)
   
      The coweb server calls this method to determine if this authentication manager requires a user to enter a username and password into a login form provided by the server.
      
      :rtype: bool
   
   .. method:: requires_cookies(self)
   
      The coweb server calls this method to determine if this authentication manager requires the use Tornado's secure cookie implementation. 

      :rtype: bool
   
   .. method:: get_current_user(self, handler)
   
      The coweb server calls this method to get the username of the authenticated user or None if the user is not authenticated.
      
      :param tornado.web.RequestHandler handler: Handler requesting the username
      :rtype: str or None
   
   .. method:: check_credentials(self, handler, username, password)
   
      The coweb server calls this method to authenticate a user by checking if the user provided credentials match those known by the manager.
      
      :param tornado.web.RequestHandler handler: Handler requesting user authentication
      :param str username: Username provided by the user
      :param str password: Password provided by the user
      :return: True if the user credentials are correct, false if not
      :rtype: bool
         
   .. method:: clear_credentials(self, handler)
   
      The coweb server calls this method to clear authentication credentials for the request user.
      
      :param tornado.web.RequestHandler handler: Handler requesting user authentication

Controlling session access
~~~~~~~~~~~~~~~~~~~~~~~~~~

.. module:: coweb.access
   :synopsis: Python package defining the access manager interface and its default implementations.

.. class:: AccessBase

   Controls user and bot access to coweb sessions. A subclass must implement all of the methods in the base.

   .. method:: on_admin_request(self, username, key, collab)
   
      The coweb server calls this method when a coweb application attempts to prepare a session.
      
      :param str username: Authenticated username of the requestor
      :param str key: Key identifying the session from :js:func:`SessionInterface.prepare`.
      :param bool collab: Flag from :js:func:`SessionInterface.prepare` set to true if requesting a session supporting cooperative events, false if requesting a session supporting service bot calls only
      :return: Dictionary of name/value pairs to include in the response to the application
      :rtype: dict
      :raise: tornado.web.HTTPError to deny session preparation request
   
   .. method:: on_session_request(self, session, username)
   
      The coweb server calls this method when a coweb application attempts to join a session.
      
      :param coweb.session.Session session: Session instance the user is attempting to join
      :param str username: Authenticated username of the requestor
      :return: True to allow join, false to deny
      :rtype: bool
   
   .. method:: on_service_subscribe(self, session, username, serviceName)

      The coweb server calls this method when a coweb application attempts to subscribe to a service bot in a session.
   
      :param coweb.session.Session session: Session instance in which the user is subscribing
      :param str username: Authenticated username of the requestor
      :param str serviceName: Name of the service to which the user is subscribing
      :return: True to allow subscribe, false to deny
      :rtype: bool      
   
   .. method:: on_service_unsubscribe(self, session, username, serviceName)

      The coweb server calls this method when a coweb application attempts to unsubscribe from a service bot in a session.

      :param coweb.session.Session session: Session instance in which the user is unsubscribing
      :param str username: Authenticated username of the requestor
      :param str serviceName: Name of the service to which the user is unsubscribing
      :return: True to allow unsubscribe, false to deny
      :rtype: bool      
   
   .. method:: on_service_request(self, session, username, serviceName)

      The coweb server calls this method when a coweb application attempts to send a private request to a service bot in a session.

      :param coweb.session.Session session: Session instance in which the user is attempting the request
      :param str username: Authenticated username of the requestor
      :param str serviceName: Name of the service to which the user is attempting to contact
      :return: True to allow the request, false to deny
      :rtype: bool

   .. method:: on_service_config(self, session, serviceName)

      The coweb server calls this method when a service bot first launches in a session.

      :param coweb.session.Session session: Session instance in which the bot is launching
      :param str serviceName: Name of the service
      :return: Dictionary of name/value pairs to pass to :class:`coweb.bot.BotDelegate` constructor
      :rtype: dict
      :raise: Exception to prevent bot launch

   .. method:: on_service_acls(self, session, serviceName)
      
      The coweb server calls this method when determining the permissions granted to a launching bot.
      
      :param coweb.session.Session session: Session instance in which the bot is launching
      :param str serviceName: Name of the service
      :return: Bit mask representing of supported bot permissions, currently:
      
         :data:`coweb.access.ACL_NONE`
            No special permissions
         :data:`coweb.access.ACL_SERVICE_SYNC`
            Ability to monitor cooperative events via the :meth:`coweb.bot.BotDelegate.on_sync` callback
         :data:`coweb.access.ACL_SERVICE_ALL`
            All special permissions

      :rtype: int

Launching service bots
~~~~~~~~~~~~~~~~~~~~~~

.. module:: coweb.service.launcher
   :synopsis: Python package defining the service launcher interface and its default implementations.

.. class:: ServiceLauncherBase

   Controls the initialization of service bots per session. A subclass must implement all of the methods in the base.
   
   .. attribute:: _container
   
      Reference to the :class:`coweb.AppContainer` instance of this server
   
   .. attribute:: _bridge
   
      Instance of :class:`coweb.service.ServiceSessionBridge` the launcher can use to get information about its session

   .. method:: start_service(self, serviceName, token, serviceManager, appData)
   
      The coweb server calls this method when a service not currently running in the session must to start.
   
      :param str serviceName: Name of the service
      :param str token: Random token the bot should provide when it authenticates with the service manager
      :param coweb.service.manager.ServiceManagerBase serviceManager: Configured service manager
      :param dict appData: Additional data from the  :meth:`coweb.access.AccessBase` manager configured in the app container to pass to the bot constructor
   
   .. method:: stop_service(self, serviceName, serviceManager)
   
      The coweb server calls this method when a service not currently running in the session must stop.
   
      :param str serviceName: Name of the service
      :param coweb.service.manager.ServiceManagerBase serviceManager: Configured service manager
   
   .. method:: stop_all_services(self, serviceManager)

      The coweb server calls this method when the session has ended and all services must stop. The server invokes this method after :meth:`coweb.service.manager.ServiceManagerBase.end_services` to allow bots to shutdown gracefully. This method should terminate any bots still running.
   
      :param coweb.service.manager.ServiceManagerBase serviceManager: Configured service manager

Communicating with service bots
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. module:: coweb.service.manager
   :synopsis: Python package defining the service manager interface and its default implementations.

.. class:: ServiceManagerBase

   Controls communication with service bots per session. A subclass must implement all of the methods in the base.

   .. attribute:: _container

      Reference to the :class:`coweb.AppContainer` instance of this server
   
   .. attribute:: _bridge

      Instance of :class:`coweb.service.ServiceSessionBridge` the manager should use to post bot data to a session

   .. method:: get_connection_info(self)
   
      The coweb server calls this method to get information a bot needs to communication with this service manager instance (e.g., a URL, a port number).
      
      :return: Dictionary with name/value pairs specific to this manager and its corresponding bot wrapper implementation 
      :rtype: dict
   
   .. method:: get_manager_id(self)
   
      The coweb server calls this method to get the unique identifier of this manager. The identifier is used to locate the appropriate :class:`coweb.bot.wrapper.BaseBotWrapper` implementation that can communicate with this manager. Currently, the ID is the name of the package under :mod:`coweb.bot.wrapper` containing the bot wrapper implementation.
   
      :rtype: str
   
   .. method:: end_services(self)

      The coweb server calls this method when the session has terminated, after invoking :meth:`coweb.service.launcher.ServiceLauncherBase.stop_all_services`. The manager should cleanup gracefully here.

      :rtype: None

   .. method:: on_shutdown_request(self, serviceName)

      The coweb server calls this method when a session decides to shut down a service bot. The manager should return an object representing the message which the server will later ask it to send using :meth:`send_message`.
      
      :param str serviceName: Name of the service
      :rtype: object
   
   .. method:: on_user_request(self, serviceName, username, token, eventData)

      The coweb server calls this method when a coweb application requests a bot service. The manager should return an object representing the message which the server will later ask it to send using :meth:`send_message`.
      
      :param str serviceName: Name of the service
      :param str username: Authenticated username of the requestor
      :param str token: Random token the bot should provide when responding to this request
      :param dict eventData: Request data sent by a coweb application using :js:func:`CollabInterface.postService`
      :rtype: object
   
   .. method:: on_user_subscribe(self, serviceName, username)

      The coweb server calls this method when a coweb application subscribes to a bot service. The manager should return an object representing the message which the server will later ask it to send using :meth:`send_message`.

      :param str serviceName: Name of the service
      :param str username: Authenticated username of the requestor
      :rtype: object
   
   .. method:: on_user_unsubscribe(self, serviceName, username)

      The coweb server calls this method when a coweb application unsubscribes from a bot service. The manager should return an object representing the message which the server will later ask it to send using :meth:`send_message`.

      :param str serviceName: Name of the service
      :param str username: Authenticated username of the requestor
      :rtype: object

   .. method:: on_user_sync(self, serviceName, username, data)

      The coweb server calls this method when a coweb application sends a cooperative event to the session. The manager should return an object representing the message which the server will later ask it to send using :meth:`send_message`.
      
      :param str serviceName: Name of the service
      :param str username: Authenticated username of the requestor
      :param dict data: Event data sent by a coweb application using :js:func:`CollabInterface.sendSync`
      :rtype: object

   .. method:: start_services(self)
   
      The coweb server calls this method when the session is ready to support service requests and responses. The manager can initialize itself here.
      
      :rtype: None
   
   .. method:: send_message(self, msg, impl)
   
      The coweb server calls this method when the manager should send a message it previously constructed to a bot. The manager should transmit the message using whatever transport it supports.
      
      :param object msg: Arbitrary method object previously returned by one of the manager methods
      :param object impl: Arbitrary object previously passed to :meth:`coweb.service.ServiceSessionBridge.auth_bot`
      :rtype: None

Bridging bots and sessions
~~~~~~~~~~~~~~~~~~~~~~~~~~

.. module:: coweb.service
   :synopsis: Python package defining the service launcher interface, service manager interface, and session-service bridge.

.. class:: ServiceSessionBridge

   .. method:: auth_bot(self, serviceName, token [, impl=None])
   
      The service manager calls this method to authenticate a bot when it first contacts the manager.
   
      :param str serviceName: Name of the service
      :param str token: Authentication token passed to the bot by the launcher instance
      :param object impl: Optional object the bridge associates with the service bot. The bridge passes it to :meth:`coweb.service.manager.ServiceManagerBase.send_message` when the message is destined for the bot.
      :rtype: None
   
   .. method:: deactivate_bot(self, serviceName)

      The service manager calls this method to indicate a bot shutdown.
   
      :param str serviceName: Name of the service
      :rtype: None

   .. method:: get_session_id(self)
   
      The service manager or launcher calls this method to get the identifier of the session in which it is running.
   
      :rtype: str

   .. method:: mark_bot_subscribed(self, serviceName)
   
      The service manager calls this method to indicate a bot is ready to receive messages from the session.
   
      :param str serviceName: Name of the service
      :rtype: None

   .. method:: on_bot_response(self, serviceName, token, data)

      The service manager calls this method to deliver a bot private bot response to an application instance in a session.
   
      :param str serviceName: Name of the service
      :param str token: Request token passed to the bot by the manager instance
      :rtype: None
   
   .. method:: on_bot_publish(self, serviceName, data)

      The service manager calls this method to publish bot data to all application instances in a session.

      :param str serviceName: Name of the service
      :param dict data: Dictionary of data 
      :rtype: None