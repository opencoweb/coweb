.. reviewed 0.4
.. include:: /replace.rst

Configuration and module load
-----------------------------

A web application can configure the various implementations of the JavaScript API components used and URLs contacted for login, logout, and session preparation. If the application wishes to deviate from the default configuration, it must define a :data:`cowebConfig` object of its own **before** importing the `coweb/main` module. After loading that module, both the web application and the framework should consider the :data:`cowebConfig` read-only.

.. data:: cowebConfig (object)

   Global defining the global options for the use of the |coweb api| on the page. If the application does not define this global, the framework initializes it with all of the default documented below upon `coweb/main` load.

.. attribute:: cowebConfig.adminUrl (string)

   URL to contact with session preparation requests. Defaults to `/admin`.

.. attribute:: cowebConfig.collabImpl (string)

   Module name containing the :class:`CollabInterface` implementation to use. This implementation must be able to communicate with the configured :attr:`cowebConfig.listenerImpl`. Defaults to `coweb/collab/UnmanagedHubCollab`.

.. attribute:: cowebConfig.debug (boolean)

   Indicates if extra debugging information should be logged to the JavaScript console or not. Defaults to `false`.

.. attribute:: cowebConfig.listenerImpl (string)

   Module name containing the :class:`ListenerInterface` implementation to use. This implementation must be able to communicate with the configured :attr:`cowebConfig.collabImpl`. Defaults to `coweb/listener/UnmanagedHubListener`.
   
.. attribute:: cowebConfig.loginUrl (string)

   Optional URL to contact with requests for authentication with the coweb server. Defaults to `/login`.

.. attribute:: cowebConfig.logoutUrl (string)

   Optional URL to contact with requests to deauthorize a user with the coweb server. Defaults to `/logout`.

.. attribute:: cowebConfig.sessionImpl (string)

   Module name containing the :class:`SessionInterface` implementation to use. This implementation must be able to communicate with the running coweb server. Defaults to `coweb/session/BayeuxSession`.
   
Bootstrapping a coweb application
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

As noted in :doc:`concepts`, the JavaScript portions of the |coweb api| follow the `Asynchronous Module Definition`_ and require an `AMD`_ loader. The rough steps needed to bootstrap a coweb application are the following:

#. The application HTML page loads.
#. The page includes a script tag that loads an AMD loader.
#. The application uses the AMD loader to load the `coweb/main` module and any other dependencies it may have (e.g., its own modules, third-party libraries).
#. The application initializes one or more :class:`CollabInterface` instances (e.g., one per cooperative widget) and subscribes for various notifications (e.g., session ready, coweb sync events).
#. After the DOM load event, the application initializes the :class:`SessionInterface` singleton and uses it to prepare the session.
#. When the :class:`SessionInterface` finishes preparing, joining, and updating, all :class:`CollabInterface.subscribeReady` callbacks fire.

Basic application template
~~~~~~~~~~~~~~~~~~~~~~~~~~

.. todo:: write