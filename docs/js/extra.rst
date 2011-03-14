.. reviewed 0.3
.. include:: /replace.rst

Extra modules
-------------

A web application can use the optional modules discussed in the following sections to simplify common coweb tasks such as tracking session attendance and adding cooperative capabilities to application widgets.

The use of these extra modules has the following requirements:

#. If the application needs a custom :data:`cowebConfig`, the configuration must be defined before before importing any extra coweb module.
#. The application must use an `AMD`_ loader to import the desired submodule of `coweb/ext`.

Tracking attendance
~~~~~~~~~~~~~~~~~~~

A web application can load the the `coweb/ext/attendance` module as a convenient way to track user attendance in a session. The module creates a singleton attendance tracker upon import with the interface described below.

.. note:: 

   The tracker makes no attempt to determine attendance before its initialization. If an application is going to use the tracker, the app must import the tracker module and subscribe to its notifications before attempting to enter a session.

.. attribute:: attendance.users

   Read-only object representing the roster of users that have joined and updated to the shared session state. Object property name is the site ID of the user and the value is his/her authenticated username.
   
.. function:: attendance.subscribeChange(contextOrCallback[, boundCallback])

   A web application calls this method to subscribe to a notification that the attendance of the session changed in some way.
   
   :param function callback: Callback invoked when the attendance interface receives the event. Receives an object having these properties:
   
      type (string)
         String `join` or `leave` indicating the kind of user status change
      users (object[])
         Array of :ref:`attendee information objects <ext-attendee-obj>` representing the users that changed state
      count (number)
         Integer number of users in the session now
   
   :return: :class:`Promise` notification of subscription success or failure

.. function:: attendance.unsubscribe(token)

   A web application calls this method to unsubscribe any callback registered with any subscribe method on this attendance instance.

   :param token: The return value from a previous call to a subscribe method on this instance.
   :return: :class:`Promise` notification of unsubscribe success or failure

.. _ext-attendee-obj:

Attendee information objects
############################

All callbacks subscribed to attendance notifications receive an anonymous object with information about a user attending the session as a first parameter. Each object has at least the following attributes.

.. attribute:: attendee.username

   String username of the authenticated user

.. attribute:: attendee.site

   Integer site identifier of the user

.. attribute:: attendee.local
   
   True if this object represents the local user or false for a remote user

Loading applications
~~~~~~~~~~~~~~~~~~~~

A web application can load the `coweb/ext/SimpleLoader` module as an alternative means to configuring its :class:`SessionInterface` and other common coweb components. Typically, an application will subclass the :class:`SimpleLoader` base to customize its load process.

.. class:: SimpleLoader
   
   Allows subclasses to control :class:`SessionInterface` options and receive :class:`SessionInterface` notifications by overriding instance attributes and methods respectively.

.. attribute:: SimpleLoader.collab

   A web application can use this instance of :class:`CollabInterface` for its own purposes. By default, the :func:`onCollabReady` callback is subscribed to to a notification on instance.

.. attribute:: SimpleLoader.cowebCollab

   A web application can set this attribute to control the `collab` parameter to :func:`SessionInterface.prepare`. Defaults to true.

.. attribute:: SimpleLoader.cowebKey

   A web application can set this attribute to control the `key` parameter to :func:`SessionInterface.prepare`. Defaults to undefined.

.. attribute:: SimpleLoader.sess

   A web application can access the :class:`SessionInterface` directly via this instance variable.

.. function:: SimpleLoader.onCollabReady(info)

   A web application can override this callback subscribed via :func:`CollabInterface.subscribeReady`.

.. function:: SimpleLoader.onRun()

   A web application can override this callback to perform some actions after invoking :func:`SimpleLoader.run` and before :func:`SimpleLoader.prepare`.

.. function:: SimpleLoader.onSessionFailed(err)

   A web application can override this callback to receive notification of an error during any phase of joining the session: prepare, join, or update.

   :param Error err: Error raised

.. function:: SimpleLoader.onSessionJoined(info)

   A web application can override this callback subscribed via the :func:`SessionInterface.join` promise.

.. function:: SimpleLoader.onSessionPrepared(info)

   A web application can override this callback subscribed via the :func:`SessionInterface.prepare` promise.

.. function:: SimpleLoader.onSessionUpdated(info)

   A web application can override this callback subscribed via the :func:`SessionInterface.update` promise.
   
.. function:: SimpleLoader.run()

   A web application must invoke this method to start the loader running.

Making widget cooperative
~~~~~~~~~~~~~~~~~~~~~~~~~

.. todo:: write