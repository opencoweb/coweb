.. reviewed 0.4
.. include:: /replace.rst

Code organization
-----------------

The current implementation of the coweb framework has code modules roughly split
along language lines. An overview of the source tree follows:

::

   docs/          # Sphinx documentation source
   servers/
      java/       # Java server coweb modules
      python/     # Python server coweb package
   js/
      build/      # Build profiles for the coweb JavaScript (outdated, doesn't work properly)
      release/    # Stable, minified builds of the coweb JavaScript modules (for use with python)
      test/       # JavaScript coweb tests (outdated, not supported at this time)

JavaScript
~~~~~~~~~~

The JavaScript, client-side portion of the framework appears under
:file:`servers/java/coweb-javascript` in the source tree. All JS files under
this folder are in `Asynchronous Module Definition`_ (AMD) format.

Note that this code is used by all browser clients regardless of the type of
server they are connecting to (Java or Python). The code lives in the same
directory as the Java server (:file:`servers/java`) so that all Maven modules
live in the same directory.

::

   coweb/
      main.js     # Top-level factory functions
      topics.js   # Constant topic names
      collab/     # CollabInterface implementations (send/recv coweb events)
      ext/        # Optional components
      jsoe/       # Operation engine git submodule (see coweb-jsoe git repo)
      listener/   # ListenerInterface implementations (JS to protocol bridge)
      session/    # SessionInterface implementations (join/leave meetings)

Java
~~~~

A Java implementation of a coweb server lives under :file:`servers/java`. The
server code is split across Maven modules separating bot interfaces from the
messaging server. Convenience modules containing the coweb JavaScript and
defining a coweb application archetype reside here as well.

::

   coweb-archetype/     # Maven archetype for creating a new coweb app
   coweb-bots/          # Builds a JAR module with interfaces for writing bots
   coweb-javascript/    # Builds a WAR containing the latest stable coweb JS
                        # The coweb JavaScript source lives here as well.
   coweb-server/        # Builds a JAR module with the coweb server infrastructure 

Python
~~~~~~

A Python implementation of a coweb server lives under :file:`servers/python`.
The server code exists in a single Python package named :py:mod:`coweb` in
this path. The key subpackages of :py:mod:`coweb`, particularly those that
allow extension of the server, are depicted below.

::

   coweb/
      access/           # Interface and impl for access control
      auth/             # Interface and impl for auth methods
      bot/              
         wrappers/      # Interface and impl for bot wrappers
      service/
         launcher/      # Interface and impl for bot launchers
         manager/       # Interface and impl for bot transports and managers
      cowebpyoe/        # Python version of the operation engine
   pycoweb              # Coweb application container deploy script
   setup.py             # Distutils install script

