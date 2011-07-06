.. reviewed 0.4
.. include:: /replace.rst

Configuration and load
----------------------

A web application can configure the various implementations of the JavaScript API components used and URLs contacted for login, logout, and session preparation. If the application wishes to deviate from the default configuration, it must define a :data:`cowebConfig` object of its own **before** importing the `coweb/main` module. After loading that module, both the web application and the framework should consider the :data:`cowebConfig` read-only.

.. data:: cowebConfig

   Global defining the global options for the use of the |coweb api| on the page. If the application does not define this global, the framework initializes it with all of the default documented below upon `coweb/main` load.

.. attribute:: cowebConfig.adminUrl

   String URL to contact with session preparation requests. Defaults to `/admin`.
   
.. attribute:: cowebConfig.baseUrl

   String base URL to use as the prefix for any other absolute URL in this configuration. Does not affect relative URLs. Defaults to an empty string.
   
   .. versionadded:: 0.6

.. attribute:: cowebConfig.collabImpl

   String module name containing the :class:`CollabInterface` implementation to use. This implementation must be able to communicate with the configured :attr:`cowebConfig.listenerImpl`. Defaults to `coweb/collab/UnmanagedHubCollab`.

.. attribute:: cowebConfig.debug

   Boolean indicates if extra debugging information should be logged to the JavaScript console or not. Defaults to `false`.

.. attribute:: cowebConfig.listenerImpl

   String module name containing the :class:`ListenerInterface` implementation to use. This implementation must be able to communicate with the configured :attr:`cowebConfig.collabImpl`. Defaults to `coweb/listener/UnmanagedHubListener`.
   
.. attribute:: cowebConfig.loginUrl

   Optional string URL to contact with requests for authentication with the coweb server. Defaults to `/login`.

.. attribute:: cowebConfig.logoutUrl

   Optional string URL to contact with requests to deauthorize a user with the coweb server. Defaults to `/logout`.

.. attribute:: cowebConfig.sessionImpl

   String module name containing the :class:`SessionInterface` implementation to use. This implementation must be able to communicate with the running coweb server. Defaults to `coweb/session/BayeuxSession`.

.. attribute:: cowebConfig.cacheState

   Boolean indicates if the server session state should be cached.

Bootstrapping a coweb application
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

As noted in :doc:`concepts`, the JavaScript portions of the |coweb api| follow the `Asynchronous Module Definition`_ and require an `AMD`_ loader. The rough steps needed to bootstrap a coweb application are the following:

#. The application HTML page loads.
#. The page includes a script tag that loads an AMD loader.
#. The application uses the AMD loader to load the `coweb/main` module and any other dependencies it may have (e.g., its own modules, third-party libraries).
#. The application initializes one or more :class:`CollabInterface` instances (e.g., one per cooperative widget) and subscribes for various notifications (e.g., session ready, coweb sync events).
#. After the DOM load event, the application initializes the :class:`SessionInterface` singleton and uses it to prepare the session.
#. When the :class:`SessionInterface` finishes preparing, joining, and updating, all :class:`CollabInterface.subscribeReady` callbacks fire.

Example application template
############################

A template for a coweb application having a couple of cooperative widgets follows and a non-default `admin` URL follows. The application uses `RequireJS`_ as its AMD loader. It assumes all of its AMD resources reside under :file:`lib/` and its subfolders.

For a more complete example, revisit the tutorial about :doc:`/tutorial/shopping`.

index.html
++++++++++

.. sourcecode:: html

   <!DOCTYPE html>
   <html>
     <head>
       <meta charset="utf-8" />
       <title>My Cooperative Web Application</title>
       <script data-main="app-main" src="lib/require.js"></script>
     </head>
     <body>
     </body>
   </html>

app-main.js
+++++++++++

RequireJS loads this script after it loads because of the `data-main` attribute on its script tag. It is relative to the page that included RequireJS, not the path in which RequireJS resides.

.. sourcecode:: javascript

   // e.g., server has admin in same path as application, not default /admin
   var cowebConfig = {
      adminUrl : './admin'
   };

   require([
      'coweb/main',
      'app-widgets/widget1',
      'app-widgets/widget2'
   ], function(coweb, widget1, Widget2) {
      // instantiate the widget class
      var w = new Widget2('widget2');
      
      // wait for window onload
      require.ready(function() {
         // initialize the session instance
         var session = coweb.initSession();
         // do the session prepare
         session.prepare().then(function() {
            // prepare success, widget ready callbacks invoked after this
         }, function() {
            // prepare failure
         });
      });
   });

lib/app-widgets/widget1.js
++++++++++++++++++++++++++

This widget module has no public interface and is totally self-contained.

.. sourcecode:: javascript

   define(['coweb/main'], function(coweb) {
      // internal widget state
      var state = {};
      // widget CollabInterface instance
      var collab = coweb.initCollab({id : 'widget1'});

      collab.subscribeReady(function(info) {
         // called when the widget can start sending/receiving coweb events
      });
      collab.subscribeStateRequest(function(token) {
         // called when a remote instance with the same id requests full state
         collab.sendStateResponse(state, token);
      });
      collab.subscribeStateResponse(function(state) {
         // called when this instance receives a copy of the shared state from
         // a remote instance with the same id
      });
   });

lib/app-widgets/widget2.js
++++++++++++++++++++++++++

This widget module defines a class which the importer must instantiate.

.. sourcecode:: javascript

   define(['coweb/main'], function(coweb) {
      var Widget = function(id) {
         // widget CollabInterface instance
         this.collab = coweb.initCollab({id : id});
         // subscribe methods for callbacks
         this.collab.subscribeReady(this, 'onReady');
         // subscribeStateRequest, subscribeStateResponse, etc. like widget1
      };

      Widget.prototype.onReady = function() {
         // similar to widget #1
      };
      
      // onStateRequest, onStateResponse, etc. like widget1
      
      // return the Widget class
      return Widget;
   });