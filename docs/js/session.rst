.. include:: /replace.rst

Session preparation and joining
-------------------------------

A web application creates one :class:`SessionInterface` instance per browser document frame to control authentication, session preparation, session joining, and session exiting operations against a coweb server. The application receives callbacks from the :class:`SessionInterface` as these operations progress, succeed, or fail.

The use of the session API has the following requirements:

#. The web application must include the OpenAjax Hub v1.0.
#. The application must include Dojo 1.5 or higher.
#. The application must :func:`dojo.require` the `coweb` module.

Initializing the session instance
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. function:: coweb.initSession([params])

   A web application or its runtime environment calls this method once to get a reference to a :class:`SessionInterface` instance. The factory selects the best available implementation of the session interface based on availability and browser capabilities.

   All parameters to this function are optional. When given, they are passed as name/value properties on a single `params` object.

   :param bool debug: Dictates whether the session implementation will log additional debugging information (true) or not (false). Defaults to false.
   :param string adminUrl: URL to contact with session preparation requests. Defaults to `/admin`.
   :param string loginUrl: URL to contact with requests for authentication with the coweb server. Defaults to `/login`.
   :param string logoutUrl: URL to contact with requests to deauthorize a user with the coweb server. Defaults to `/logout`.
   :param string listenerImpl:  Package and class name as a dotted string indicating the session implementation under `coweb.listener` to use. If undefined, the session factory determines the best implementation available.
   :param string sessionImpl: Package and class name as a dotted string indicating the session implementation under `coweb.session` to use. If undefined, the session factory determines the best implementation available.
   :returns: :class:`SessionInterface`

Using the session instance
~~~~~~~~~~~~~~~~~~~~~~~~~~

.. class:: SessionInterface()

   Singleton encapsulating the session APIs for web application use. A web application should use the :func:`coweb.initSession` factory function instead of instantiating this object directly.

.. function:: SessionInterface.getVersion()

   A web application calls this method to get the version number of the coweb framework.

   :returns: dojo.Deferred
   :callback: Invoked with the version string in dotted notation x.x
   :errback: Unused

.. function:: SessionInterface.getConferenceParams()

   A web application calls this method to get the last arguments passed to :func:`SessionInterface.prepareConference`. The arguments include any values inferred by the framework such as defaults.

   :returns: object

.. function:: SessionInterface.joinConference()

      A web application calls this method to join a session after receiving a callback from :func:`SessionInterface.prepareConference`. If the application invoked :func:`SessionInterface.prepareConference` with `autoJoin` set to true, the framework automatically invokes this method upon the callback.

   :throws Error: If invoked before preparing the session or after joining a session
   :returns: dojo.Deferred
   :callback: Invoked on successful preparation with an object having these attributes:

      nextDef (dojo.Deferred)
         Deferred for the automatic call to :func:`SessionInterface.updateInConference` if `autoUpdate` was true. Useful for call chaining.

   :errback: Invoked on failed preparation with a string error tag of `not-allowed` if the user needs to authenticate, `session-unavailable` if the session ended before joining, or `server-unavailable`

   :callback: Invoked on successful join
   :errback: Invoked on failed join

.. function:: SessionInterface.login(username, password)
   
   A web application calls this method to send a username and password to the configured login URL on the coweb server. This method is for application convenience. The application can choose to authenticate with the coweb server in any other server-supported manner.
   
   :param string username: Username to authenticate
   :param string password: Password for the user
   :throws Error: If invoked after starting the prepare-join-update procedure
   :returns: dojo.Deferred (from dojo.xhrPost)
   :callback: Invoked on successful login
   :errback: Invoked on failed login

.. function:: SessionInterface.leaveConference()

   A web application calls this method to leave a session while or after entering it.

   :returns: dojo.Deferred
   :callback: Invoked on successful exit
   :errback: Invoked on failed exit

.. function:: SessionInterface.logout()

   A web application calls this method to contact the configured logout URL on the coweb server. This method is for application convenience. The application can choose to remove authentication credentials in any other server-supported manner.

   :returns: dojo.Deferred (from dojo.xhrPost)
   :callback: Invoked on successful logout
   :errback: Invoked on failed logout

.. function:: SessionInterface.prepareConference([args])
   
   A web application calls this method to request access to a session before attempting to join it.
   
   All parameters to this function are optional. When given, they are passed as name/value properties on a single `params` object.

   :param string key: Key uniquely identifying the session to join. If undefined, tries to read the argument `cowebkey` from the page URL to use instead. If the argument is undefined, uses the (domain, port, path, arguments) tuple of the current page as the key. 
   :param bool collab: True to request a session supporting cooperative events, false to request a session supporting service bot messages only
   :param bool autoJoin: True to automatically join a session after successfully preparing it, false to require an explicit application call to :func:`SessionInterface.joinConference`.
   :param bool autoUpdate: True to automatically update application state in a session after successfully joining it, false to require an explicit application call to :func:`SessionInterface.updateInSession`.
   :throws Error: If invoked after preparing a session
   :returns: dojo.Deferred
   :callback: Invoked on successful preparation with an object having these attributes:

      collab (bool)
         If the session was prepared as collaborative or not. May or may not match what was requested.
      key (string)
         Session key passed to :func:`SessionInterface.prepareConference`
      info (object)
         Arbitrary name/value pairs included by a coweb server extension point
      nextDef (dojo.Deferred)
         Deferred for the automatic call to :func:`SessionInterface.joinConference` if `autoJoin` was true. Useful for call chaining.
      username (string)
         Name of the authenticated user
      sessionurl (string)
         URL to contact to join the session
      sessionid (string)
         Unique session identifier

   :errback: Invoked on failed preparation with a string error tag of `not-allowed` if the user needs to authenticate or `server-unavailable`

.. function:: SessionInterface.updateInConference()

      A web application calls this method to update its local state after receiving a callback from :func:`SessionInterface.joinConference`. If the application invoked :func:`SessionInterface.prepareConference` with `autoUpdate` set to true, the framework automatically invokes this method upon the callback.

   :throws Error: If invoked before joining a session or after updating in a session
   :returns: dojo.Deferred
   :callback: Invoked on successful update with no parameters
   :errback: Invoked on failed preparation with a string error tag of `bad-application-state` if the update fails.

.. _session-states:

Session busy states
~~~~~~~~~~~~~~~~~~~

The session API publishes status topics on the |oaa hub| as it progresses through the phases of preparing, joining, and updating in a session. It also publishes topics when errors or disconnections occur during a session. These topics exist to aid the creation of user interface notices informing the user of their status with respect to a session.

.. data:: coweb.BUSY

   A web application can subscribe to this topic using  `OpenAjax.hub.subscribe`__ to receive session status change notifications. The value the callback receives is one of the following:

   preparing
      Now preparing the session
   joining
      Now joining the session
   updating
      Now updating the local application state in the session
   ready
      Now ready for cooperative interaction in the session
   aborting
      Now aborting the prepare, join, and update process
   stream-error
      Now disconnected from the session because of a server or communication error
   server-unavailable
      Now disconnected from the session because the server is unreachable
   server-unavailable
      Now disconnected from the session because the session is unreachable
   bad-application-state
      Now disconnected from the session because the local application raised an error during the update phase
   clean-disconnect
      Now disconnected from the session because of an expected disconnect

__ http://www.openajax.org/member/wiki/OpenAjax_Hub_1.0_Specification_PublishSubscribe#OpenAjax.hub.subscribe.28name.2C_callback.2C_scope.2C_subscriberData.2C_filter.29

Use cases
~~~~~~~~~

The following code snippets demonstrate some common uses of the session API.

Application attempts to enter a session
#######################################

Assume an application wants to enter a session without delay.

.. sourcecode:: javascript

   // get session interface
   var sess = coweb.initSession();
   // collaborative session desired, join automatically after prepare
   var params = {collab: true, autoJoin : true};
   sess.prepareConference(params).then(null,
      function(err) {
         // handle any error cases
      }
   );

Application acts on session info before joining
###############################################

Imagine an application wants to configure its UI based on the prepare response before joining the session.

.. sourcecode:: javascript

   // get session interface
   var sess = coweb.initSession();
   // collaborative session desired, join automatically after prepare
   var params = {collab: true, autoJoin : false};
   sess.prepareConference(params).then(
      function(info) {
         // app does some work (e.g., shows session info in its UI)
         // at some later point, app continues process by joining
         return sess.joinConference();
      }
   ).then(null,
      function(err) {
         // handle any error cases
      }   
   );

Application does its own authentication
#######################################

Say an application wants to collection credentials from a user before attempting to prepare the session.

.. sourcecode:: javascript

   // get session interface
   var sess = coweb.initSession();
   // assume username / password vars contain info collected via a form or 
   // some other means
   sess.login({username : username, password : password}).then(
      function() {
         // do the prep
      },
      function() {
         // auth failed, prompt again
      }
   );

.. seealso::

   :doc:`extra`
      Documentation of optional components that simplify the use of the session API in common cases.

   :doc:`/tutorial/shopping`
      Tutorial detailing the use of the session API to create a cooperative shopping list.
