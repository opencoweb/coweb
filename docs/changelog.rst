.. include:: /replace.rst

Changelog
---------

Version 0.4
~~~~~~~~~~~

* Rewritten to be toolkit agnostic by removing all dependencies on The Dojo Toolkit.
* All JavaSript modules now conform to the `Asynchronous Module Definition`_ format.
* All examples moved to the http://github.com/opencoweb/cowebx repository.
* All UI components (e.g., BusyDialog) moved to the cowebx repository.
* Minified, aggregated builds of coweb JavaScript are now committed in tagged, stable releases under :file:`js/release/coweb-VERSION`.
* Separated deployment from the Python package install process.
* Cleaned up the Maven archetype and package dependencies.
* Removed the legacy term *Conference* from all API methods in :class:`SessionInterface` and :class:`CollabInterface` (e.g., :class:`SessionInterface.prepareConference` is now :class:`SessionInterface.prepare`).
* All callback methods now receive a single object argument with well-defined properties (e.g., :class:`CollabInterface.subscribeSync`).
* The global :data:`cowebConfig` object now dictates the implementations of :class:`SessionInterface`, :class:`CollabInterface`, and :class:`ListenerInterface` to load dynamically instead of the :func:`coweb.initSession` and :func:`coweb.initCollab` factory functions.
* :func:`SessionInterface.onStatusChange` replaced the implementation specific use of OpenAjax Hub to indicate changes to session status.
* :class:`LayoutLoader` was removed as it was toolkit specific and could be easily accomplished using :class:`SimpleLoader`.
* :class:`SimpleLoader` always automatically prepares, joins, and updates now. For finer-grained control, use the :class:`SessionInterface` class directly.

Version 0.3
~~~~~~~~~~~

* :py:meth:`org.coweb.CowebSecurityPolicy.canSubscribeToSession` method changed parameters and meaning.

Version 0.2
~~~~~~~~~~~

* First release of manual doc and Javadocs.

Version 0.1
~~~~~~~~~~~

* First open source code drop.