.. include:: /replace.rst
.. default-domain:: py

Manager extension points
-------------------------

The various manager classes specified in a :class:`coweb.AppContainer` derive from abstract base classes representing extension points in the :mod:`coweb` package. New implementations of these base classes can define new methods of authenticating users, controlling session access, launching bots, and communicating with bots.

The creation and use of new managers requires:

#. The installation of the :mod:`coweb` package into the Python import path.
#. The import of the new manager module into an application container script.
#. The configuration of an application container to use the new manager instead of its default.

Revisit the section about :doc:`container` for assistance configuring a coweb server to use a third-party manager.

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
      :param str key: Key identifying the session from :js:func:`SessionInterface.prepareConference`.
      :param bool collab: Flag from :js:func:`SessionInterface.prepareConference` set to true if requesting a session supporting cooperative events, false if requesting a session supporting service bot calls only
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

      The coweb server calls this method when a user attempts to subscribe to a service bot in a session.
   
      :param coweb.session.Session session: Session instance in which the user is subscribing
      :param str username: Authenticated username of the requestor
      :param str serviceName: Name of the service to which the user is subscribing
      :return: True to allow subscribe, false to deny
      :rtype: bool      
   
   .. method:: on_service_unsubscribe(self, session, username, serviceName)

      The coweb server calls this method when a user attempts to unsubscribe from a service bot in a session.

      :param coweb.session.Session session: Session instance in which the user is unsubscribing
      :param str username: Authenticated username of the requestor
      :param str serviceName: Name of the service to which the user is unsubscribing
      :return: True to allow unsubscribe, false to deny
      :rtype: bool      
   
   .. method:: on_service_request(self, session, username, serviceName)

      The coweb server calls this method when a user attempts to send a private request to a service bot in a session.

      :param coweb.session.Session session: Session instance in which the user is attempting the request
      :param str username: Authenticated username of the requestor
      :param str serviceName: Name of the service to which the user is attempting to contact
      :return: True to allow the request, false to deny
      :rtype: bool

   .. method:: on_service_config(self, session, serviceName)

      The coweb server calls this method when a service bot first launches in a session.

      :param coweb.session.Session session: Session instance in which the bot is launching
      :param str serviceName: Name of the service
      :return: Dictionary of name/value pairs to pass to :class:`coweb.bot.Delegate` constructor
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
            Ability to monitor cooperative events via the :meth:`coweb.bot.Delegate.on_sync` callback
         :data:`coweb.access.ACL_SERVICE_ALL`
            All special permissions

      :rtype: int

Launching service bots
~~~~~~~~~~~~~~~~~~~~~~

.. module:: coweb.service.launcher
   :synopsis: Python package defining the service launcher interface and its default implementations.

.. class:: ServiceLauncherBase

   Controls the initialization of service bots per session.

   .. method:: __init__(self, container, bridge)
   
   .. method:: start_service(self, serviceName, token, serviceManager, appData)
   
   .. method:: stop_service(self, serviceName, serviceManager)
   
   .. method:: stop_all_services(self, serviceManager)

Communicating with service bots
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. module:: coweb.service.manager
   :synopsis: Python package defining the service manager interface and its default implementations.

.. class:: ServiceManagerBase

   Controls communication with service bots per session.

   .. method:: __init__(self, container, bridge)
   
   .. method:: get_manager_id(self)
   
   .. method:: get_connection_info(self)
   
   .. method:: start_services(self)
   
   .. method:: end_services(self)
   
   .. method:: send_message(self, msg, impl)
   
   .. method:: on_user_request(self, serviceName, username, token, eventData)
   
   .. method:: on_user_subscribe(self, serviceName, username)
   
   .. method:: on_user_unsubscribe(self, serviceName, username)
   
   .. method:: on_shutdown_request(self, serviceName)
   
   .. method:: on_user_sync(self, serviceName, username, data)
