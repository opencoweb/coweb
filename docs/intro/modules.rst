.. include:: /replace.rst

Code organization
-----------------

.. todo:: write

::

   docs/          # Sphinx documentation source
   servers/
      java/       # Java server coweb modules
      python/     # Python server coweb packages
   www/
      examples/   # coweb demos
      libs/
         coweb/   # JavaScript coweb modules
         coweb.js
      tests/      # JavaScript coweb tests

JavaScript
~~~~~~~~~~

Under :file:`www/libs`

::
   
   coweb.js       # Top-level factory functions
   coweb/
      collab/     # CollabInterface implementations
      collab.js
      ext/
      jsoe/       # Operation engine
      layers/     # Dojo build profiles
      listener/   # HubListener implementations
      listener.js
      session/    # SessionInterface implementations
      session.js
      topics.js   # Constant topic names

Java
~~~~

Under :file:`servers/java`

::

   coweb_archetype/     # Maven archetype for creating a new coweb app
   coweb_bots/          # Builds a JAR module with interfaces for writing bots
   coweb_example/       # Builds a WAR with the coweb demos
   coweb_javascript/    # Builds a WAR containing all the Dojo / coweb JS
   coweb_server/        # Builds a JAR module with the coweb server infrastructure 

Python
~~~~~~

Under :file:`servers/python`

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