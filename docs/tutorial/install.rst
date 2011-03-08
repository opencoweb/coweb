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

.. _maven-archetype:

Generate a new coweb application
################################

Once the coweb modules are installed in your local repository, you can initialize your own coweb application with the following command.

.. sourcecode:: console

   $ cd /desired/project/path
   $ mvn archetype:generate 
      -DarchetypeGroupId=org.coweb 
      -DarchetypeArtifactId=coweb-archetype

Enter your desired groupId (e.g., `com.acme`) and artifactId (e.g., `myproject`) when prompted. Confirm the defaults unless you wish to choose an older / newer version of the coweb server to use.

After populating the project, you can package it and deploy it using Maven.

.. sourcecode:: console

   $ cd myproject
   $ mvn package
   $ mvn jetty:deploy-war

Python setup
~~~~~~~~~~~~

The |coweb API| includes a Python cooperative web server implementation based on `Tornado`_. The Python server requires Python 2.6 or 2.7 which ship with or easily installable on most \*nix/BSD operating systems.

The Python setup currently relies on `virtualenv`_ 1.5.1 or higher. Make sure you have it installed before continuing.

.. sourcecode:: console
   
   $ sudo pip install virtualenv       # run this ...
   $ sudo easy_install virtualenv      # or this

.. _empty-virtualenv:

Install an empty coweb virtualenv
#################################

If you want to create a virtualenv containing all the pre-requisites needed to develop your own coweb application, do the following:

#. Create a virtual environment to host your coweb server.

   .. sourcecode:: console
      
      $ virtualenv /desired/project/path

#. Activate the environment.

   .. sourcecode:: console
      
      $ source /desired/project/path/bin/activate

#. Use `pip` to install `Tornado_` and the :py:mod:`coweb` package in the virtual environment.

   .. sourcecode:: console
   
      $ cd servers/python
      $ pip install -r requirements.txt

#. Use the `pycoweb` command to create a new coweb deployment in the virtual environment root.

   .. sourcecode:: console
   
      $ pycoweb deploy /desired/project/path

#. Execute the generated coweb application container script to start the server.

   .. sourcecode:: console

      $ run_server.py
      $ deactivate      # to leave the virtualenv after quitting the server

By default, the script makes the contents of :file:`/desired/project/path/www` accessible at http://localhost:9000/www. Modify the :file:`/desired/project/pathbin/run_server.py` script and restart the server to make changes to these, and other, defaults. See the Python documentation section about :doc:`/python/container` for details.

Install using distutils
#######################

You can manually run the distutils :file:`setup.py` to install the Python `coweb` package in your system :file:`site-packages`. If you take this approach, you must resolve dependencies yourself (e.g., `Tornado`_). Otherwise, the steps are the same sans use of virtualenv.

Configuring server instances
############################

You can configure Python server instances by modifying the application container script produced by :file:`pycoweb deploy`. See the Python section about :doc:`/python/container` for details.