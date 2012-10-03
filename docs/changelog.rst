.. reviewed 0.4
.. include:: /replace.rst

Changelog
---------

Version 0.8.3.1
~~~~~~~~~~~~~~~

* Javascript OT engine is now a git submodule of the OCW coweb-jsoe repo. This doesn't affect API
  or usage of the OCW code, but it does affect development for OCW. Development of coweb-jsoe is
  separate for the coweb repo, and the coweb-javascript/src/main/webapp/coweb/jsoe submodule
  needs to be updated when coweb-jsoe is updated.
* Update to use cometd 2.5
* Moderator.onSync() now receives the topic as part of the map argument. The map has a new key
  "channel" which is the bayeux channel name. See https://github.com/opencoweb/coweb/issues/201
* Websockets is now available as a cometd transport. See https://github.com/opencoweb/coweb/issues/207

Version 0.8.3
~~~~~~~~~~~~~

* Changed Moderator API: `org.coweb.SessionModerator`_ ``getLateJoinState`` returns a ``Map`` of collab topics.
* Fixed moderator bugs.
* Fixed whiteboard cowebx-widget bug.
* Critical sections of coweb-server now correctly synchronized.

Version 0.6
~~~~~~~~~~~

* Added :data:`cowebConfig.baseUrl` parameter to support deployments behind proxies.
* Added :data:`cowebConfig.cacheState` parameter to support turning on state caching.

Version 0.5
~~~~~~~~~~~

* Updated the :doc:`coweb Bayeux protocol <protocol/coweb_bayeux>` to separate application operations from operation engine synchronization messages and better define the fields of a coweb event message.
* Removed the `strictJson` option from the :doc:`Python application container </python/container>` command line, making all JSON parsing strict.

Version 0.4
~~~~~~~~~~~

* Rewritten to be toolkit agnostic by removing all dependencies on The Dojo Toolkit.
* All JavaSript modules now conform to the `Asynchronous Module Definition`_ format.
* All examples and toolkit dependent widgets moved to the http://github.com/opencoweb/cowebx repository.
* Minified, aggregated builds of coweb JavaScript are now committed in tagged, stable releases under :file:`js/release/coweb-VERSION`. Both the Maven and Python setup scripts install such builds instead of the exploded developer source.
* Separated application deployment using `pycoweb` from the standard Python package install process using `setup.py`.
* Cleaned up the Maven archetype and package dependencies.
* Removed the legacy term *Conference* from all API methods in :class:`SessionInterface` and :class:`CollabInterface` (e.g., :class:`SessionInterface.prepareConference` is now :class:`SessionInterface.prepare`).
* All callback methods now receive a single object argument with well-defined properties (e.g., :class:`CollabInterface.subscribeSync`).
* The global :data:`cowebConfig` object now dictates the implementations of :class:`SessionInterface`, :class:`CollabInterface`, and :class:`ListenerInterface` to load dynamically instead of the :func:`coweb.initSession` and :func:`coweb.initCollab` factory functions.
* :func:`SessionInterface.onStatusChange` replaced the :class:`ListenerInterface` implementation specific use of OpenAjax Hub to indicate changes to session status.
* :class:`LayoutLoader` was removed as it was toolkit specific. It's functionality can be reproduced using the :class:`SessionInterface` directly.
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
