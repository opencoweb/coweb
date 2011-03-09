.. include:: /replace.rst

Extra APIs and components
-------------------------

A web application can use the optional components defined in the following sections to simplify common coweb tasks such as reporting the session status to a user and configuring an application during session startup.

The use of these components API has the following requirements:

#. The application must use an AMD loader to import the desired submodule of `coweb/ext`.

Loading applications
~~~~~~~~~~~~~~~~~~~~

A web application can load the `coweb/ext/SimpleLoader` module as an alternative means to configuring its :class:`SessionInterface` and other common coweb components. Typically, an application will subclass this class to customize its load process.

.. class:: SimpleLoader
   
   Allows subclasses to control :class:`SessionInterface` options and receive deferred :class:`SessionInterface` notifications by overriding instance attributes and methods respectively.
   
.. attribute:: SimpleLoader.showBusy

   A web application can set this attribute to true to load and initialize the optional :ref:`session busy dialog <ext-busy-dialog>`. Defaults to false which also avoids loading the module.

.. attribute:: SimpleLoader.autoPrepare

   A web application can set this attribute to true to automatically prepare the session after :func:`SimpleLoader.onRun` or false if it will invoke :func:`SimpleLoader.prepare` explicitly. Defaults to true.

.. attribute:: SimpleLoader.autoJoin

   A web application can set this attribute to control the equivalent parameter to :func:`SessionInterface.prepare`. Defaults to true.

.. attribute:: SimpleLoader.autoUpdate

   A web application can set this attribute to control the equivalent parameter to :func:`SessionInterface.prepare`. Defaults to true.

.. attribute:: SimpleLoader.adminUrl

   A web application can set this attribute to control the equivalent parameter to :func:`coweb.initSession`. Defaults to undefined.

.. attribute:: SimpleLoader.collab

   A web application can use this instance of :class:`CollabInterface` for its own purposes. By default, the :func:`onCollabReady` callback is subscribed to to a notification on instance.

.. attribute:: SimpleLoader.conferenceCollab

   A web application can set this attribute to control the `collab` parameter to :func:`SessionInterface.prepare`. Defaults to true.

.. attribute:: SimpleLoader.conferenceKey

   A web application can set this attribute to control the `key` parameter to :func:`SessionInterface.prepare`. Defaults to undefined.

.. attribute:: SimpleLoader.loginUrl

   A web application can set this attribute to control the equivalent parameter to :func:`coweb.initSession`. Defaults to undefined.

.. attribute:: SimpleLoader.logoutUrl

   A web application can set this attribute to control the equivalent parameter to :func:`coweb.initSession`. Defaults to undefined.

.. attribute:: SimpleLoader.sess

   A web application can access the :class:`SessionInterface` directly via this instance variable.

.. function:: SimpleLoader.onCollabReady(info)

   A web application can override this callback subscribed via :func:`CollabInterface.subscribeReady`.

.. function:: SimpleLoader.onRun()

   A web application can override this callback to perform some actions after invoking :func:`SimpleLoader.run` and before :func:`SimpleLoader.prepare`.

.. function:: SimpleLoader.onSessionFailed()

   A web application can override this callback subscribed via the :func:`SessionInterface.update` deferred. The callback fires if a failure occurs during any of the prepare, join, or update phases.

.. function:: SimpleLoader.onSessionJoined()

   A web application can override this callback subscribed via the :func:`SessionInterface.join` deferred. The callback fires automatically only if :attr:`SimpleLoader.autoJoin` is true.

   If :attr:`SimpleLoader.autoUpdate` is false, the application must invoke `this.sess.update` after receiving this callback.

.. function:: SimpleLoader.onSessionPrepared(info)

   A web application can override this callback subscribed via the :func:`SessionInterface.prepare` deferred.

   If :attr:`SimpleLoader.autoJoin` is false, the application must invoke `this.sess.join` after receiving this callback.

.. function:: SimpleLoader.onSessionUpdated()

   A web application can override this callback subscribed via the :func:`SessionInterface.update` deferred. The callback fires automatically only if :attr:`SimpleLoader.autoUpdate` is true.

.. function:: SimpleLoader.prepare()

   A web application must invoke this method in or after :func:`SimpleLoader.onRun` if :attr:`SimpleLoader.autoPrepare` is false. The method invokes :func:`SessionInterface.prepare` with parameters configured by this loader instance.

.. function:: SimpleLoader.run()

   A web application must invoke this method to start the loader running.

Tracking attendance
~~~~~~~~~~~~~~~~~~~

A web application can load the the `coweb/ext/attendance` module as a convenient way to track user attendance in a session. The module creates a singleton attendance tracker upon import with the interface described below.

.. note:: 

   The tracker makes no attempt to determine attendance before its initialization. If an application is going to use the tracker, the app must import the tracker module and subscribe to its notifications before attempting to join a session.

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