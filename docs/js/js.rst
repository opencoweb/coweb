.. reviewed 0.4
.. include:: /replace.rst

JavaScript APIs
---------------

The JavaScript API allows a web application to control its participation in a session and the transmission of cooperative events and service data. These features are split across two primary interfaces, the :class:`SessionInterface` and the :class:`CollabInterface` respectively. The |coweb api| provides a default implementation for each, but allows the loading and use of alternative implementations specified in a global :attr:`cowebConfig` object.

The JavaScript API also includes some extra components which can ease the development of coweb applications, but are completely optional.

.. toctree::
   :titlesonly:
   
   concepts
   config
   session
   collab
   extra