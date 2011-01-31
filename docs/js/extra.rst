.. include:: /replace.rst

Extra APIs and components
-------------------------

A web application can use the optional components defined in the following sections to simplify common coweb tasks such as reporting the session status to a user and configuring an application during session startup.

The use of these components API has the following requirements:

#. The web application must include the OpenAjax Hub v1.0.
#. The application must include Dojo 1.5 or higher.
#. The application must :func:`dojo.require` the appropriate `coweb` submodule of the component.

.. _ext-busy-dialog:

Showing session progress
~~~~~~~~~~~~~~~~~~~~~~~~

A web application can :func:`dojo.require` the `coweb.ext.ui.BusyDialog` module to show a modal dialog reflecting the various :ref:`session busy states <session-states>`. The dialog prevents user manipulation of the underlying application UI while the app is busy entering a session or when the session fails unexpectedly.

.. note:: 

   The busy dialog dynamically requires various parts of Dijit which may not be appropriate for all applications (e.g., mobile).

.. function:: coweb.ext.ui.createBusy(session)

   A web application calls this method to create a busy dialog singleton. After its creation, the dialog monitors :data:`coweb.BUSY` events to update its display. The dialog automatically hides itself when the application is ready in the application and reappears if the connection to the session is unexpectedly terminated.
   
   :param SessionInterface session: Session instance
   :returns: :class:`coweb.ext.ui.BusySheet` widget within the dialog displaying busy status

.. function:: coweb.ext.ui.destroyBusy

   A web application calls this method to destroy its busy dialog singleton.

Loading applications
~~~~~~~~~~~~~~~~~~~~

A web application can :func:`dojo.require` the `coweb.ext.loaders.SimpleLoader` module as an alternative means to configuring its :class:`SessionInterface` and other common coweb components. Typically, an application will subclass this class to customize its load process.

.. class:: SimpleLoader
   
   Allows subclasses to control :class:`SessionInterface` options and receive deferred :class:`SessionInterface` notifications by overriding instance attributes and methods respectively.
   
.. attribute:: SimpleLoader.showBusy

   A web application can set this attribute to true to load and initialize the optional :ref:`session busy dialog <ext-busy-dialog>`. Defaults to false which also avoids loading the module.

.. attribute:: SimpleLoader.autoPrepare

   A web application can set this attribute to true to automatically prepare the session after :func:`SimpleLoader.onRun` or false if it will invoke :func:`SimpleLoader.prepare` explicitly. Defaults to true.

.. attribute:: SimpleLoader.autoJoin

   A web application can set this attribute to control the equivalent parameter to :func:`SessionInterface.prepareConference`. Defaults to true.

.. attribute:: SimpleLoader.autoUpdate

   A web application can set this attribute to control the equivalent parameter to :func:`SessionInterface.prepareConference`. Defaults to true.

.. attribute:: SimpleLoader.adminUrl

   A web application can set this attribute to control the equivalent parameter to :func:`coweb.initSession`. Defaults to undefined.

.. attribute:: SimpleLoader.collab

   A web application can use this instance of :class:`CollabInterface` for its own purposes. By default, the :func:`onCollabReady` callback is subscribed to to a notification on instance.

.. attribute:: SimpleLoader.conferenceCollab

   A web application can set this attribute to control the `collab` parameter to :func:`SessionInterface.prepareConference`. Defaults to true.

.. attribute:: SimpleLoader.conferenceKey

   A web application can set this attribute to control the `key` parameter to :func:`SessionInterface.prepareConference`. Defaults to undefined.

.. attribute:: SimpleLoader.loginUrl

   A web application can set this attribute to control the equivalent parameter to :func:`coweb.initSession`. Defaults to undefined.

.. attribute:: SimpleLoader.logoutUrl

   A web application can set this attribute to control the equivalent parameter to :func:`coweb.initSession`. Defaults to undefined.

.. attribute:: SimpleLoader.sess

   A web application can access the :class:`SessionInterface` directly via this instance variable.

.. function:: SimpleLoader.onCollabReady(info)

   A web application can override this callback subscribed via :func:`CollabInterface.subscribeConferenceReady`.

.. function:: SimpleLoader.onRun()

   A web application can override this callback to perform some actions after invoking :func:`SimpleLoader.run` and before :func:`SimpleLoader.prepare`.

.. function:: SimpleLoader.onSessionFailed()

   A web application can override this callback subscribed via the :func:`SessionInterface.updateInConference` deferred. The callback fires if a failure occurs during any of the prepare, join, or update phases.

.. function:: SimpleLoader.onSessionJoined()

   A web application can override this callback subscribed via the :func:`SessionInterface.joinConference` deferred. The callback fires automatically only if :attr:`SimpleLoader.autoJoin` is true.

   If :attr:`SimpleLoader.autoUpdate` is false, the application must invoke `this.sess.updateInConference` after receiving this callback.

.. function:: SimpleLoader.onSessionPrepared(info)

   A web application can override this callback subscribed via the :func:`SessionInterface.prepareConference` deferred.

   If :attr:`SimpleLoader.autoJoin` is false, the application must invoke `this.sess.joinConference` after receiving this callback.

.. function:: SimpleLoader.onSessionUpdated()

   A web application can override this callback subscribed via the :func:`SessionInterface.updateInConference` deferred. The callback fires automatically only if :attr:`SimpleLoader.autoUpdate` is true.

.. function:: SimpleLoader.prepare()

   A web application must invoke this method in or after :func:`SimpleLoader.onRun` if :attr:`SimpleLoader.autoPrepare` is false. The method invokes :func:`SessionInterface.prepareConference` with parameters configured by this loader instance.

.. function:: SimpleLoader.run()

   A web application must invoke this method to start the loader running.

Loading layouts
###############

A web application can :func:`dojo.require` the `coweb.ext.loaders.LayoutLoader` module to gain the ability to load different application layouts in addition to what :class:`SimpleLoader` provides.

.. class:: LayoutLoader

   Extends :class:`SimpleLoader` with the ability to XHR files in parallel with the session prepare, join, and update process.

.. attribute:: LayoutLoader.layoutUrls

   Array of URLs to XHR fetch or a single string URL

.. function:: LayoutLoader.onLayoutFailed(url)

   A web application overrides this method to receive notification when a requested layout fails to load.
   
   :param string url: URL that failed to load

.. function:: LayoutLoader.onLayoutLoaded(url, layout)

   A web application overrides this method to receive notification when a requested layout loads.
   
   :param string url: URL that loaded
   :param string layout: Content of the resource at the URL (e.g., HTML)
   
.. function:: LayoutLoader.onLayoutsLoaded(layouts)

   A web application overrides this method to receive notification when all layout requests complete, successfully or not.

   :param object layouts: Object containing successfully loaded layouts keyed by their request URLs

Tracking attendance
~~~~~~~~~~~~~~~~~~~

A web application can :func:`dojo.require` the `coweb.ext.attendance` module as a convenient way to track user attendance in a session. The module creates a singleton attendance tracker upon import with the interface described below.

.. note:: 

   The tracker makes no attempt to determine attendance before its initialization. If an application is going to use the tracker, the app must import the tracker module before attempting to join a session.
   
.. function:: coweb.ext.attendance.subscribeLocalJoin(callback)

   A web application calls this method to subscribe to a notification that the local user is fully joined to a conference.
   
   :param function callback: Callback invoked when the attendance interface receives the event. The callback receives two parameters, an :ref:`attendee information object <ext-attendee-obj>` and the total number of users in the conference.
   :return: :class:`dojo.Deferred` notification of subscription success or failure

.. function:: coweb.ext.attendance.subscribeRemoteJoin(callback)

   A web application calls this method to subscribe to a notification that a remote user is fully joined to a conference.

   :param function callback: Callback invoked when the attendance interface receives the event. The callback receives two parameters, an :ref:`attendee information object <ext-attendee-obj>` and the total number of users in the conference.
   :return: :class:`dojo.Deferred` notification of subscription success or failure

.. function:: coweb.ext.attendance.subscribeRemoteLeave(callback)

   A web application calls this method to subscribe to a notification that a remote user has left a conference.

   :param function callback: Callback invoked when the attendance interface receives the event. The callback receives two parameters, an :ref:`attendee information object <ext-attendee-obj>` and the total number of users in the conference.
   :return: :class:`dojo.Deferred` notification of subscription success or failure

.. function:: coweb.ext.attendance.subscribeRemoteExisting(callback)

   A web application calls this method to subscribe to a notification for each user already in a conference when the local user fully joins that conference.

   :param function callback: Callback invoked when the attendance interface receives the event. The callback receives two parameters, an :ref:`attendee information object <ext-attendee-obj>` and the total number of users in the conference.
   :return: :class:`dojo.Deferred` notification of subscription success or failure

.. function:: coweb.ext.attendance.unsubscribe(token)

   A web application calls this method to unsubscribe any callback registered with any subscribe method on this attendance instance.

   :param token: The return value from a previous call to a subscribe method on this instance.
   :return: :class:`dojo.Deferred` notification of unsubscribe success or failure

.. function:: coweb.ext.attendance.getUserAtSite(site)

   A web application calls this method to get information about the attendee at a given site.
   
   :param int site: Integer site identifier
   
.. _ext-attendee-obj:

Attendee information objects
############################

All callbacks subscribed to attendance notifications receive an anonymous object with information about a user attending the session as a first parameter. Each object has at least the following attributes.

.. attribute:: attendee.username

   String username of the authenticated user

.. attribute:: attendee.site

   Integer site identifier of the user