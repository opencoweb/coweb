.. reviewed 0.4
.. include:: /replace.rst

Deploying cooperative web servers and applications
--------------------------------------------------

Cooperative web applications require the JavaScript components of the coweb framework and a cooperative web server to host sessions. The steps in this tutorial explain how to meet these requirements based on your preferred server language: Java or Python.

Java setup
~~~~~~~~~~

The |coweb API| includes a Java cooperative web servlet implementation based on the CometD Jetty code. The coweb server can run anywhere the CometD Jetty Java code works, and will perform best under a servlet 3.0 compliant container.

The Java setup currently relies on `Apache Maven`_ 2.2.1 or higher for builds. Make sure you have it installed before continuing.

.. _maven-install:

Install the coweb modules
#########################

Start by building the and installing the coweb modules in your local Maven repository. Maven automatically downloads all the necessary dependencies.

.. sourcecode:: console

   $ cd servers/java
   $ mvn install

.. note:: 
   
   The first build may take a long time as Maven downloads and caches all of the required packages. Subsequent builds will be much faster.

.. _maven-archetype:

Generate a new coweb application
################################

Once the coweb modules are installed in your local repository, you can initialize your own coweb application with the following command.

.. sourcecode:: console

   $ cd /desired/project/path
   $ mvn archetype:generate 
      -DarchetypeGroupId=org.opencoweb 
      -DarchetypeArtifactId=coweb-archetype

Enter your desired groupId (e.g., `com.acme`) and artifactId (e.g., `myproject`) when prompted. Confirm the defaults unless you wish to choose an older / newer version of the coweb server to use.

After populating the project, you can package it and deploy it using Maven.

.. sourcecode:: console

   $ cd myproject
   $ mvn clean package
   $ mvn jetty:deploy-war

By default, the `jetty:deploy-war` command makes your application accessible at http://localhost:8080/. Specify the `-Djetty.port=PORT` option on the command line to run on a different port.

Modify the :file:`web.xml` file created by the archetype, repackage your application, and redeploy it make changes to defaults. See the Java documentation section about :doc:`/java/deploy` for details.

Deploy the cowebx demos
#######################

The http://github.com/opencoweb/cowebx repository on GitHub contains the coweb example applications running at http://demos.opencoweb.org. Follow these instructions if you want to deploy the cowebx demos on your own Java server after using Maven to install the coweb modules as described above.

#. Clone a copy of the cowebx git repository or download a snapshot of it from https://github.com/opencoweb/cowebx/tarball/master.
#. Use Maven to package and install the `cowebx` submodules.

   .. sourcecode:: console
   
      $ cd cowebx
      $ mvn install

#. Use Maven to deploy `cowebx-apps`.

   .. sourcecode:: console

      $ cd cowebx/cowebx-apps
      $ mvn jetty:deploy-war

#. Visit http://localhost:8080/cowebx-apps in your browser to view the list of demos.

Python setup
~~~~~~~~~~~~

The |coweb API| includes a Python cooperative web server implementation based on `Tornado`_. The Python server requires Python 2.6 or 2.7 which ship with or are easily installable on most \*nix/BSD operating systems.

.. _virtualenv-install:

Create a new coweb virtualenv
#############################

If you want to create a virtualenv containing all the pre-requisites needed to develop and/or deploy your own coweb application, do the following:

#. Install `virtualenv`_ 1.5.1 or higher.

   .. sourcecode:: console
   
      $ sudo pip install virtualenv       # run this ...
      $ sudo easy_install virtualenv      # or this

#. Create a virtual environment to host your coweb server.

   .. sourcecode:: console
      
      $ virtualenv /desired/project/path

#. Activate the environment.

   .. sourcecode:: console
      
      $ source /desired/project/path/bin/activate

#. Use :file:`pip` to install :py:mod:`coweb` package and its dependencies in the virtual environment.

   .. sourcecode:: console
   
      $ cd servers/python
      $ pip install .

#. Use the :file:`pycoweb` command to create a new coweb deployment in the virtual environment root.

   .. sourcecode:: console
   
      $ pycoweb deploy /desired/project/path

#. Execute the generated coweb application container script to start the server.

   .. sourcecode:: console

      $ run_server.py
      $ deactivate      # to leave the virtualenv after quitting the server

By default, the script makes the contents of :file:`/desired/project/path/www` accessible at http://localhost:8080/www. Modify the :file:`/desired/project/pathbin/run_server.py` script and restart the server to make changes to these, and other, defaults. See the Python documentation section about :doc:`/python/container` for details.

.. _distutils-install:

Install using distutils
#######################

You can manually run the distutils :file:`setup.py` to install the Python `coweb` package in your system :file:`site-packages` or the active virtualenv. If you take this approach, you must resolve dependencies yourself (e.g., `Tornado`_). Otherwise, the steps are the same sans use of pip.

Deploy the cowebx demos
#######################

The http://github.com/opencoweb/cowebx repository on GitHub contains the coweb example applications running at http://demos.opencoweb.org. Follow these instructions if you want to deploy the cowebx demos on your own Python server after installing the :py:mod:`coweb` Python package as described above.

#. Clone a copy of the cowebx git repository or download a snapshot of it from https://github.com/opencoweb/cowebx/tarball/master.
#. If you installed the :py:mod:`coweb` package in a virtual environment, activate that environment. Otherwise, skip this step.

   .. sourcecode:: console
   
      $ source /desired/project/path/bin/activate

#. Use the :file:`setup.py` script to deploy the demos and a server container script to run them.

   .. sourcecode:: console
   
      $ cd cowebx/cowebx-apps
      $ python setup.py deploy /desired/project/path --force

   .. note:: This command will overwrite any :file:`run_server.py` script that already exists in :file:`/desired/project/path/bin` (e.g., if you ran :file:`pycoweb` previously to seed an empty application in the virtualenv).

#. Execute the generated coweb application container script to start the server.

   .. sourcecode:: console

      $ run_server.py
      $ deactivate      # to leave the virtualenv after quitting the server

#. Visit http://localhost:8080/cowebx-apps/index.html in your browser to view the list of demos.