.. include:: /replace.rst
.. default-domain:: py

Manager extension points
-------------------------

Some of the options defined in the :class:`coweb.AppContainer`

Authenticating users
~~~~~~~~~~~~~~~~~~~~

.. module:: coweb.auth
   :synopsis: Python package defining the authentication manager interface and its default implementations.

.. class:: AuthBase

   .. method:: requires_login(self)
   
   .. method:: requires_cookies(self)
   
   .. method:: get_current_user(self, handler)
   
   .. method:: check_credentials(self, handler, username, password)
   
   .. method:: clear_credentials(self, handler)

Controlling session access
~~~~~~~~~~~~~~~~~~~~~~~~~~

.. module:: coweb.access
   :synopsis: Python package defining the access manager interface and its default implementations.

.. class:: AccessBase

   .. method:: on_admin_request(self, username, key, collab)
   
   .. method:: on_session_request(self, session, username)
   
   .. method:: on_service_subscribe(self, session, username, serviceName)
   
   .. method:: on_service_unsubscribe(self, session, username, serviceName)
   
   .. method:: on_service_request(self, session, username, serviceName)
   
   .. method:: on_service_config(self, session, serviceName)
   
   .. method:: on_service_acls(self, session, serviceName)

Launching service bots
~~~~~~~~~~~~~~~~~~~~~~

.. module:: coweb.service.launcher
   :synopsis: Python package defining the service launcher interface and its default implementations.

.. class:: ServiceLauncherBase

   .. method:: __init__(self, container, bridge)
   
   .. method:: start_service(self, serviceName, token, serviceManager, appData)
   
   .. method:: stop_service(self, serviceName, serviceManager)
   
   .. method:: stop_all_services(self, serviceManager)

Communicating with service bots
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. module:: coweb.service.manager
   :synopsis: Python package defining the service manager interface and its default implementations.

.. class:: ServiceManagerBase

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
