.. include:: /replace.rst

Code organization
-----------------

The current implementation of the coweb framework has code modules roughly split along language lines. An overview of the source tree follows:

::

   docs/          # Sphinx documentation source
   servers/
      java/       # Java server coweb modules
      python/     # Python server coweb packages
   www/
      examples/   # Coweb demos
      libs/
         coweb/   # JavaScript coweb modules
         coweb.js
      tests/      # JavaScript coweb tests

JavaScript
~~~~~~~~~~

The JavaScript, client-side portion of the framework appears under :file:`www/libs` in the source tree. All JS files under this folder are currently Dojo modules to be loaded using :func:`dojo.require`.

::
   
   coweb.js       # Top-level factory functions
   coweb/
      collab/     # CollabInterface implementations
      collab.js
      ext/        # Optional components
      jsoe/       # Operation engine
      layers/     # Dojo build profiles
      listener/   # HubListener implementations
      listener.js
      session/    # SessionInterface implementations
      session.js
      topics.js   # Constant topic names

Java
~~~~

A Java implementation of a coweb server lives under :file:`servers/java`. The server code is split across a couple Maven modules separating bot interfaces from the messaging server. Convenience modules containing the coweb JavaScript and the Dojo Toolkit, and the coweb demos reside here as well.

::

   coweb_archetype/     # Maven archetype for creating a new coweb app
   coweb_bots/          # Builds a JAR module with interfaces for writing bots
   coweb_example/       # Builds a WAR with the coweb demos
   coweb_javascript/    # Builds a WAR containing all the Dojo / coweb JS
   coweb_server/        # Builds a JAR module with the coweb server infrastructure 

Python
~~~~~~

A Python implementation of a coweb server lives under :file:`servers/python`. The server code exists in a single Python package named :py:mod:`coweb` in this path. The key subpackages of :py:mod:`coweb`, particularly those that allow extension of the server, are depicted below.

::

   bots/                # Example Python bots
   coweb/
      access/           # Interface and impl for access control
      auth/             # Interface and impl for auth methods
      bot/              
         wrappers/      # Interface and impl for bot wrappers
      service/
         launcher/      # Interface and impl for bot launchers
         manager/       # Interface and impl for bot transports and managers
   setup.py             
   setup_demoenv.py     # Creates a virtualenv containing the coweb demos
   setup_emptyenv.py    # Creates a virtualenv for a new coweb app
   setup_devenv.py      # Creates a virtualenv for dev on the coweb framework