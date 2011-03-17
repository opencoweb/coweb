.. reviewed 0.4
.. include:: /replace.rst
.. default-domain:: py
.. module:: coweb
   :synopsis: Python package containing a coweb server implementation.

Application containers
----------------------

A Python coweb server starts with an instance of :class:`coweb.AppContainer` which configures the running server. The default implementation included in the :mod:`coweb` package defines the available options and default configuration via instance variables and callback functions. Subclasses created using the :file:`pycoweb` script can override these defaults to customize a coweb server deployment.

The creation of an application container requires:

#. The installation of the :mod:`coweb` package into the Python import path.
#. The installation of the :file:`pycoweb` script into the run path.

Both of these requirements are satisfied by following the setup documented under :doc:`/tutorial/install`.

Generating an app container
~~~~~~~~~~~~~~~~~~~~~~~~~~~

To generate a new application container script with all of its configuration options documented, use the :file:`pycoweb container` command like so:

.. sourcecode:: console

   $ pycoweb container my_script
   
To create a pre-configured container script named :file:`bin/run_server.py` plus directories for static web content (:file:`www`) and service bots (:file:`bots`), use the :file:`pycoweb deploy` command:

.. sourcecode:: console

   $ pycoweb deploy /some/path
   $ ls /some/path
     bin  bots www

Run `pycoweb --help` to see the full set of supported options described below.

.. program:: pycoweb

.. option:: -f, --force

   Force an overwrite of any files or folders in the target directory if they already exist. Defaults to false.

.. option:: -t <template>

   Name or filename of the template to use to seed the application container script. Defaults to `verbose` which produces a full documented script with all options and their defaults listed in code comments. A value of `simple` produces a minimal script. Any other value is treated as a template filename to to use to generate the script. See the `verbose` and `simple` templates under :file:`scripts` in the :py:mod:`coweb` Python package as examples for writing your own templates.

.. option:: --no-js

   Prevent the stable, minified version of the JavaScript framework files from being copied into the :file:`www` directory when using :file:`pycoweb deploy`. Defaults to false. 

Running an app container
~~~~~~~~~~~~~~~~~~~~~~~~

To run a coweb server instance, execute the application container script like so:

.. sourcecode:: console

   $ ./coweb_app.py

.. program:: coweb_app.py

.. option:: --debug

   Enables Tornado debug mode where any changes to the server scripts causes a automatic restart of the server. Also enables the `/debug` URL endpoint with information about sessions in progress. Defaults to false.

.. option:: --port =PORT

   Specifies the HTTP port on which the server listens. Defaults to the one configured in the script. Specifying a port on the command line is useful for starting multiple coweb server processes without modifying the script.

.. option:: --strictJson

   Enables strict JSON checking on incoming messages from JavaScript where `undefined` is not allowed according to the JSON spec. Defaults to false.

Run :file:`coweb_app.py --help` for additional options provided by Tornado.

Configuring an app container
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Configuring an application container amounts to editing the :class:`coweb.AppContainer` subclass in the script produced by :file:`pycoweb`.

.. class:: AppContainer

   Configures and starts a coweb server instance.

   .. attribute:: accessClass
   
      Subclass of :class:`coweb.access.AccessBase` to use for controlling user authentication on the coweb server. Defaults to :mod:`coweb.auth.PublicAccess` allowing access by all users.
      
      No other implementations are currently available in the :mod:`coweb` package. New access managers can be created, however, by subclassing :class:`coweb.access.AccessBase`.

      This attribute may also be set to a 2-tuple with the class reference as the first element and a dictionary to be passed as keyword arguments to the class constructor as the second.

   .. attribute:: appSettings
   
      Dictionary of settings passed to the :class:`tornado.web.Application` constructor.

   .. attribute:: authClass
   
      Subclass of :class:`coweb.auth.AuthBase` to use for controlling user authentication on the coweb server. Defaults to :mod:`coweb.auth.PublicAuth` allowing authentication by all users with a randomly assigned username.
      
      Other available implementations of :class:`coweb.auth.AuthBase` include:
      
         * :class:`coweb.auth.IniAuth` supporting form-based plain-text or MD5-hashed auth (Only an example implementation, **not for production!**)
      
      New authentication managers can be created by subclassing :class:`coweb.access.AccessBase`.
      
      This attribute may also be set to a 2-tuple with the class reference as the first element and a dictionary to be passed as keyword arguments to the class constructor as the second.
   
   .. attribute:: containerPath
   
      String absolute path of where the container script is located. All other path options are relative to this location. Defaults to the absolute path of the running script.
      
   .. attribute:: cowebIdleTimeout
   
      Floating point window in seconds before an inactive coweb client is disconnected from a session. Defaults to `30`.
   
   .. attribute:: cowebBotLocalPaths
   
      List of string paths to search for local Python service bots used by :mod:`coweb.service.ServiceLauncherBase` implementations. Defaults to `['bots']`.

   .. attribute:: httpPort
   
      Integer port number on which the coweb server listens. Defaults to `8080` and is overridden by any :option:`coweb_app.py --port` command line argument.
   
   .. attribute:: httpStaticPath
   
      String path to static web accessible resources. Defaults to :file:`./www`. Set to None to make no path web accessible and only expose the coweb resources (e.g., when deploying HTTP resources on nginx/Apache and proxying to the coweb server).
   
   .. attribute:: modulePath
   
      String absolute path where the imported :mod:`coweb` Python package resides. Defaults to the absolute path of :mod:`coweb.__file__`.
   
   .. attribute:: serviceLauncherClass
   
      Subclass of :class:`coweb.service.ServiceLauncherBase` to use for launching service bots in sessions. Defaults to a 2-tuple with class :class:`coweb.service.ProcessLauncher` and dictionary `{sandbox : 'nobody', botPaths : self.cowebBotLocalPaths}`.

      Other available implementations of :class:`coweb.service.ServiceLauncherBase` include:
      
         * :class:`coweb.service.ObjectLauncher` supporting the direct import of Python bots into the coweb server process

      New service launchers can be created by subclassing :class:`coweb.service.ServiceLauncherBase`.

      This attribute may also be set to a lone class reference if the class requires no keyword arguments upon instantiation.
   
   .. attribute:: serviceManagerClass
   
      Subclass of :class:`coweb.service.ServiceManagerBase` to use for launching service bots in sessions. Defaults to :mod:`coweb.service.BayeuxServiceManager` which enables Bayeux over WebSocket communication with bots.

      Other available implementations of :class:`coweb.service.ServiceManagerBase` include:
      
         * :class:`coweb.service.ObjectServiceManager` supporting direct instantiation and direct method invocation on bots imported into the coweb server process

      New service launchers can be created by subclassing :class:`coweb.service.ServiceManagerBase`.

      This attribute may also be set to a 2-tuple with the class reference as the first element and a dictionary to be passed as keyword arguments to the class constructor as the second.

   .. attribute:: webAdminUrl
   
      String absolute URL for the coweb admin resource controlling session lookup. Defaults to :attr:`webRoot` + `admin/`.

   .. attribute:: webLoginUrl
   
      String absolute URL for login. Defaults to :attr:`webRoot` + `login`.
   
   .. attribute:: webLogoutUrl
   
      String absolute URL for logout. Defaults to :attr:`webRoot` + `logout`.

   .. attribute:: webRoot
   
      String URL where all web resources are rooted by default. Defaults to :file:`/`.
   
   .. attribute:: webSecretKey
   
      String secret key for :mod:`coweb.auth.AuthBase` managers that use Tornado's secure cookie implementation. Defaults to a GUID generated by :file:`pycoweb`.
   
   .. attribute:: webSessionRoot
   
      String absolute URL for coweb session Bayeux endpoints. Defaults to :attr:`webRoot` + `session/`.

   .. attribute:: webStaticRoot
   
      String absolute URL for static web resources in the :attr:`httpStaticPath`. Defaults to :attr:`webRoot` + `www/`.
   
   .. method:: on_configure(self)
   
      The constructor invokes this method after defining the default attribute values but before computing relative paths. Override any attributes in here.
      
      :rtype: None
   
   .. method:: on_build_auth_manager(self)
   
      The constructor invokes this method to instantiate the configured authentication manager at server startup. Override to customize manager instantiation.
      
      :rtype: :class:`coweb.auth.AuthBase`
   
   .. method:: on_build_access_manager(self)
   
      The constructor invokes this method to instantiate the configured access manager at server startup. Override to customize manager instantiation.

      :rtype: :class:`coweb.access.AccessBase`

   .. method:: on_build_service_launcher(self, sessionBridge)
   
      The session manager invokes this method to instantiate the configured service launcher at session startup. Override to customize manager instantiation.
      
      :class:`coweb.service.ServiceLauncherBase`
   
   .. method:: on_build_service_manager(self, sessionBridge)

      The session manager invokes this method to instantiate the configured service manager at session startup. Override to customize manager instantiation.
      
      :class:`coweb.service.ServiceManagerBase`
   
   .. method:: on_build_web_handlers(self)
   
      The constructor invokes this method to get the list :class:`tornado.web.RequestHandler` classes and their arguments as parameters for the :class:`tornado.web.Application` constructor. Override to add application specific handlers in addition to the coweb handlers included by default.
   
   .. method:: on_build_web_app(self, handlers, settings)
   
      The constructor invokes this method to instantiate a :class:`tornado.web.Application` instance, passing it the handler list from :meth:`on_build_web_handlers` and the settings from :attr:`appSettings`. Override to perform additional work.

Use cases
~~~~~~~~~

The following examples demonstrate how modifying the application container options enables alternative server configurations.

No static web resources
#######################

Assume all web application resources reside on server like Apache or nginx which also acts as a reverse proxy for traffic to the coweb server. In this situation, the coweb server is configured only to handle session traffic and not share any static web resources.

.. sourcecode:: python

   #!/usr/bin/env python
   import coweb

   class ProxiedExample(coweb.AppContainer):
      def on_configure(self):
         # disable static web resource sharing
         self.httpStaticPath = None
         # other options can follow

   if __name__ == '__main__':
      coweb.run_server(ProxiedExample)

Form-based authentication
#########################

Say a certain deployment requires the coweb server to control authentication rather than an external application server. The coweb server is configured to support form-based authentication against a local datastore of usernames and passwords. In this case, the datastore is a simple INI file containing usernames and passwords.

.. note::

   Use of INI files for storing user credentials is clearly not recommend in production. Subclass :class:`coweb.auth.AuthBase` to implement an authentication manager that can connect to your secure credential store.

.. sourcecode:: python

   #!/usr/bin/env python
   import coweb
   import coweb.auth.ini.IniAuth

   class FormLoginExample(coweb.AppContainer):
      def on_configure(self):
         # produced by pycoweb script
         self.webSecretKey = '61bdd2b16db149c699d6e1d9d8ad239b'
         # use init auth manager
         self.authClass = coweb.auth.ini.IniAuth
         # other options can follow

   if __name__ == '__main__':
      coweb.run_server(FormLoginExample)

Bots in the same process
########################

Imagine a coweb server is deployed for one specific application where the bots are known to be well-behaved (i.e., don't block, are secure). In this case, importing the bots into the coweb server process and invoking their methods directly is efficient.

.. sourcecode:: python

   #!/usr/bin/env python
   import coweb
   from coweb.service.launcher.object import ObjectLauncher
   from coweb.service.manager.object import ObjectServiceManager

   class ImportedBotsExample(coweb.AppContainer):
      def on_configure(self):
         # use object launcher and look in local bot paths for imports
         self.serviceLauncherClass = (ObjectLauncher, 
            {botPaths : self.cowebBotLocalPaths})
         # use object manager for direct invocation
         self.serviceManagerClass = ObjectServiceManager
         # other options can follow

   if __name__ == '__main__':
      coweb.run_server(ImportedBotsExample)