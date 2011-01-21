.. include:: /replace.rst

Deploying cooperative web servers and applications
--------------------------------------------------

Cooperative web applications require the JavaScript components of the coweb framework and a cooperative web server to host sessions. The steps in this tutorial explain how to meet these requirements based on your preferred server language: Java or Python.

Java setup
~~~~~~~~~~

The |coweb API| includes a Java cooperative web servlet implementation based on the CometD Jetty code. The coweb server can run anywhere the CometD Jetty Java code works, and will perform best under a servlet 3.0 compliant container.

The Java setup currently relies on `Apache Maven`_ 2.2.1 or higher for builds. Make sure you have it installed before continuing.

.. _maven-install:

Build the coweb JARs
####################

Start by building the and installing the coweb modules in your local Maven repository. Maven automatically downloads all the necessary dependencies.

.. sourcecode:: console

   $ cd servers/java
   $ mvn install

.. note:: 
   
   The first build may take a long time as Maven downloads and caches all of the required packages. Subsequent builds will be much faster.

Deploy the coweb demos
######################

If you want to try the coweb demos, follow these steps to build and deploy the :file:`coweb_example.war` under Jetty.

#. Run Jetty using Maven in the :file:`servers/java/coweb_example` directory.

   .. sourcecode:: console
   
      $ cd servers/java/coweb_example
      $ mvn jetty:run-war

#. Visit http://localhost:8080/coweb_example/comap/index.html in your browser to view the cooperative map demo.

Alternatively, you can use `mvn package` to build the WAR file and then copy it to the servlet container of your choice.

.. _maven-archetype:

Start a new coweb application
#############################

Once the coweb modules are installed in your local repository, you can initialize your own coweb application with the following command.

.. sourcecode:: console

   $ cd /desired/project/path
   $ mvn archetype:create \
      -DgroupId=<your groupId> \
      -DartifactId=<your artifactId> \
      -DcowebVersion=0.2 \
      -DarchetypeVersion=0.2 \
      -DarchetypeGroupId=org.coweb \
      -DarchetypeArtifactId=coweb_archetype

After populating the project, you can build, run, and deploy it using the same commands as the coweb demos noted above.

Python setup
~~~~~~~~~~~~

The |coweb API| includes a Python cooperative web server implementation based on `Tornado`_. The Python server requires Python 2.6 or 2.7 which ship with or easily installable on most \*nix/BSD operating systems.

The Python setup currently relies on `virtualenv`_ 1.5.1 or higher. Make sure you have it installed before continuing.

.. sourcecode:: console
   
   $ sudo pip install virtualenv       # run this ...
   $ sudo easy_install virtualenv      # or this

.. _demo-virtualenv:

Install a demo virtualenv
#########################

If you want to play with the coweb demos without thinking about dependencies and configuration yet, follow these steps to run the :file:`setup_demoenv.py` bootstrap script. The script installs `Tornado`_ 1.1 or higher and the Python coweb server package into a `virtualenv`_. The script then places copies of the `CometD`_ JavaScript, the JavaScript coweb framework, and the coweb examples into a :file:`www` folder in the virtual environment. Finally, the script creates a coweb server run script that makes the :file:`www` folder web accessible and enables anonymous access to arbitrary coweb sessions.

.. note:: The coweb demos for Python use Dojo 1.5 from the `Google CDN`_. Therefore, the bootstrap script does not place a copy of `Dojo`_ into the local web accessible folder.

#. Run the bootstrap script.

   .. sourcecode:: console

      $ cd servers/python
      $ ./setup_demoenv.py /desired/virtualenv/path

#. Activate the virtual environment and run the demo coweb server.

   .. sourcecode:: console

      $ source /desired/virtualenv/path/bin/activate
      $ run_server.py
      $ deactivate      # to leave the virtualenv after quitting the server

#. Visit http://localhost:9000/www/examples/comap/index.html in your browser to view the cooperative map demo.

.. _empty-virtualenv:

Install an empty coweb virtualenv
#################################

If you want to create a virtualenv containing all the pre-requisites needed to develop your own coweb application, follow these steps to run the  :file:`setup_emptyenv.py` bootstrap script. This script performs the same actions as the one mentioned in the section above, except it does not copy the coweb examples into the created :file:`www` folder.

#. Run the bootstrap script.

   .. sourcecode:: console

      $ cd servers/python
      $ ./setup_emptyenv.py /desired/virtualenv/path

#. Activate the virtual environment.

   .. sourcecode:: console

      $ source /desired/virtualenv/path/bin/activate

#. Modify the run script, :file:`/desired/virtualenv/path/bin/run_server.py`, to configure the server instance. The script is heavily documented explaining the defaults and available options.
#. Execute the run script to start the server.

   .. sourcecode:: console

      $ run_server.py
      $ deactivate      # to leave the virtualenv after quitting the server

Install using distutils
#######################

You can use the traditional distutils :file:`setup.py` to install the Python `coweb` package in your system :file:`site-packages`. If you follow this approach, you must manually install and/or configure `Tornado`_ 1.1 or higher, the `CometD`_ JavaScript, the coweb framework, and a coweb server run script. The :file:`servers/python/scripts/setup_js.sh` script in the framework source distribution can assist you with non-Python dependencies.

After installing all of the pre-requisites, run :file:`pycoweb --help` for assistance generating a coweb server run script.

Going further
~~~~~~~~~~~~~

.. todo:: future

Building a minified coweb.js
############################


.. _Dojo: http://dojotoolkit.org
.. _CometD: http://cometd.org
.. _Tornado: http://tornadoweb.org
.. _virtualenv: http://pypi.python.org/pypi/virtualenv
.. _Google CDN: http://code.google.com/apis/libraries/devguide.html#dojo
.. _Apache Maven: http://maven.apache.org/