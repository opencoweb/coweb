.. reviewed 0.3
.. include:: /replace.rst

Configuration and module load
-----------------------------

.. todo:: intro

.. data:: cowebConfig (object)

   .. todo:: doc

.. attribute:: cowebConfig.debug (boolean)

   Dictates whether the session implementation will log additional debugging information to the JavaScript console or not. Defaults to `false`.

.. attribute:: cowebConfig.adminUrl (string)

   URL to contact with session preparation requests. Defaults to `/admin`.
   
.. attribute:: cowebConfig.loginUrl (string)

   URL to contact with requests for authentication with the coweb server. Defaults to `/login`.

.. attribute:: cowebConfig.logoutUrl (string)

   URL to contact with requests to deauthorize a user with the coweb server. Defaults to `/logout`.

.. attribute:: cowebConfig.collabImpl (string)

   Module name containing the :class:`CollabInterface` implementation to use. This implementation must be able to communicate with the configured :attr:`cowebConfig.listenerImpl`. Defaults to `coweb/collab/UnmanagedHubCollab`.
   
.. attribute:: cowebConfig.listenerImpl (string)

   Module name containing the :class:`ListenerInterface` implementation to use. This implementation must be able to communicate with the configured :attr:`cowebConfig.collabImpl`. Defaults to `coweb/listener/UnmanagedHubListener`.

.. attribute:: cowebConfig.sessionImpl (string)

   Module name containing the :class:`SessionInterface` implementation to use. This implementation must be able to communicate with the running coweb server. Defaults to `coweb/session/BayeuxSession`.