.. reviewed 0.4
.. include:: /replace.rst

Deploying cooperative web servers and applications
--------------------------------------------------

Cooperative web applications require the JavaScript components of the coweb framework and a cooperative web server to host sessions. The steps in this tutorial explain how to meet these requirements based on your preferred server language: Java or Python.

.. note:: The latest stable release of the |coweb api| is available in `Maven Central`_ (Java) and on `PyPI`_ (Python). You should prefer these packaged versions instead of branches or tarball downloads from GitHub which require additional work to use (e.g., JS dependency fetching, JS optimization). The instructions below describe how to use these stable releases, not the raw source on GitHub.

Java setup
~~~~~~~~~~

The |coweb API| includes a Java cooperative web servlet implementation based on the CometD Jetty code. The coweb server can run anywhere the CometD Jetty Java code works, and will perform best under a servlet 3.0 compliant container.

The Java setup currently relies on `Apache Maven`_ 2.2.1 or higher and the `Java SE JDK`_ 1.6 for builds. Make sure you have them installed before continuing. You do not need to download any other coweb packages or dependencies to get started.

Installing the Java server
##########################

There are no steps to take to install the Java server. Maven automatically downloads the server components for you from `Maven Central`_ when you build your coweb application for the first time.

Deploying a coweb application
#############################

There are several ways to deploy a coweb application.

Generate a preconfigured coweb application (option #1)
$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$

The http://github.com/opencoweb/coweb-boilerplates repository on GitHub contains prebuilt snapshots of developer working environments. Follow these instructions if you want to deploy a prebuilt snapshot of a working coweb application on your own Java server. These instructions will also deploy the cowebx demos and widgets as well.

#. Clone the cowebx git repository into your desired project folder or download a snapshot of it from https://github.com/opencoweb/cowebx/tarball/master.
#. Clone the coweb-boilerplates git repository into your desired project folder or download a snapshot of it from https://github.com/opencoweb/coweb-boilerplates/tarball/master.
#. Copy the desired boiler plate into the cowebx webapp folder.

.. sourcecode:: console

   $ cp -rf coweb-boilerplates/dojo1.7-boilerplate cowebx/cowebx-apps/src/main/webapp

#. Use Maven to package and install the `cowebx` submodules.

   .. sourcecode:: console

      $ cd cowebx
      $ mvn install

#. Use Maven to deploy `cowebx-apps`.

   .. sourcecode:: console

      $ cd cowebx-apps
      $ mvn jetty:deploy-war

By default, the `jetty:deploy-war` command makes your application accessible at http://localhost:8080/cowebx-apps/dojo1.7-boilerplate/. Specify the `-Djetty.port=PORT` option on the command line to run on a different port.

Alternatively, you can take the resulting WAR file and deploy it on the servlet container of your choice.

To make changes to the archetype defaults, modify the :file:`web.xml` file created by the archetype, repackage your application, and redeploy. See the Java documentation section about :doc:`/java/deploy` for configuration details.

.. _maven-archetype:

Generate a new coweb application from scratch (option #2)
$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$

You can seed a new cooperative web application project from scratch using the Maven archetype for the latest version of the coweb framework.

#. Invoke the Maven command to generate a new project in the desired parent path of the project folder.

   .. sourcecode:: console

      $ cd /desired/project/parent/path
      $ mvn archetype:generate \
         -DarchetypeGroupId=org.opencoweb \
         -DarchetypeArtifactId=coweb-archetype 

#. Enter your desired `groupId` (e.g., `com.acme`), `artifactId` (e.g., `myproject`), `version`, and `package` when prompted. Press :kbd:`Enter` to use any suggested default.
#. Review the information you entered and press :kbd:`Enter` to confirm.
#. Review the initial contents of your project in a subfolder matching the `artifactId` you selected.

   .. sourcecode:: console

      $ ls -l myproject/src/main/webapp/

After populating the project, you can package it and deploy it in-place using the Jetty plug-in Maven.

.. sourcecode:: console

   $ cd myproject
   $ mvn clean package
   $ mvn jetty:deploy-war

By default, the `jetty:deploy-war` command makes your application accessible at http://localhost:8080/. Specify the `-Djetty.port=PORT` option on the command line to run on a different port.

Alternatively, you can take the resulting WAR file and deploy it on the servlet container of your choice.

To make changes to the archetype defaults, modify the :file:`web.xml` file created by the archetype, repackage your application, and redeploy. See the Java documentation section about :doc:`/java/deploy` for configuration details.

Deploy only the cowebx widgets / demos (option #3)
$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$

The http://github.com/opencoweb/cowebx repository on GitHub contains the coweb example applications running at http://demos.opencoweb.org. Follow these instructions if you want to deploy the cowebx demos on your own Java server.

#. Clone the cowebx git repository into your desired project folder or download a snapshot of it from https://github.com/opencoweb/cowebx/tarball/master.
#. Use Maven to package and install the `cowebx` submodules.

   .. sourcecode:: console
   
      $ cd cowebx
      $ mvn install

#. Use Maven to deploy `cowebx-apps`.

   .. sourcecode:: console

      $ cd cowebx-apps
      $ mvn jetty:deploy-war

#. Visit http://localhost:8080/cowebx-apps in your browser to view the list of demos.

Python setup
~~~~~~~~~~~~

The |coweb API| includes a Python cooperative web server implementation based on `Tornado`_ version 1.2 or higher. The Python server requires Python 2.6 or 2.7 which ship with or are easily installable on most \*nix/BSD operating systems.

.. _virtualenv-install:

Installing the Python server
############################

A Python coweb server can be deployed either in a virtual environment or system-wide using distutils.

Installing using pip and virtualenv (option #1)
$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$

If you want to create a virtualenv containing all the pre-requisites needed to develop and/or deploy your own coweb application, do the following:

#. Install `pip`_ 1.0 or higher using some automated method or manually from `PyPI`_.

   .. sourcecode:: console
   
      $ sudo easy_install pip    # works on Mac OS X 10.5+
      $ sudo apt-get install python-setuptools && \
        sudo easy_install pip    # works on Ubuntu

#. Install `virtualenv`_ 1.5.1 or higher.

   .. sourcecode:: console
   
      $ sudo pip install virtualenv

#. Create a virtual environment to host your coweb server.

   .. sourcecode:: console
      
      $ virtualenv /desired/project/path

#. Activate the environment.

   .. sourcecode:: console
      
      $ source /desired/project/path/bin/activate

#. Use :file:`pip` to install the latest stable :py:mod:`coweb` package from `PyPI`_ and its dependencies in the virtual environment.

   .. sourcecode:: console
   
      $ pip install OpenCoweb

#. Use the :file:`pycoweb` command to create a new coweb deployment in the virtual environment root.

   .. sourcecode:: console
   
      $ pycoweb deploy /desired/project/path

#. Execute the generated coweb application container script to start the server.

   .. sourcecode:: console

      $ run_server.py
      $ deactivate      # to leave the virtualenv after quitting the server

By default, the script makes the contents of :file:`/desired/project/path/www` accessible at http://localhost:8080/www. Modify the :file:`/desired/project/pathbin/run_server.py` script and restart the server to make changes to these, and other, defaults. See the Python documentation section about :doc:`/python/container` for details.

.. _distutils-install:

Installing using distutils (option #2)
$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$

Instead of using `pip`_, You can manually run the distutils :file:`setup.py` to install the Python `coweb` package in your system :file:`site-packages` or the active virtualenv. If you take this approach, you must download the framework package from `PyPI`_ and resolve dependencies yourself (e.g., `Tornado`_). Otherwise, the steps are the same sans use of `pip`_ and/or `virtualenv`_.

Deploying a coweb application
#############################

There are several ways to deploy a coweb application.

Generate a preconfigured coweb application (option #1)
$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$

The http://github.com/opencoweb/coweb-boilerplates repository on GitHub contains prebuilt snapshots of developer working environments. Follow these instructions if you want to deploy a prebuilt snapshot of a working coweb application on your Python server. These instructions will also deploy the cowebx demos and widgets as well.

#. Clone the cowebx git repository into your desired project folder or download a snapshot of it from https://github.com/opencoweb/cowebx/tarball/master.
#. Clone the coweb-boilerplates git repository into your desired project folder or download a snapshot of it from https://github.com/opencoweb/coweb-boilerplates/tarball/master.
#. Copy the desired boiler plate into the cowebx webapp folder.

.. sourcecode:: console

   $ cp -rf coweb-boilerplates/dojo1.7-boilerplate cowebx/cowebx-apps/src/main/webapp

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

#. Visit http://localhost:8080/cowebx-apps/dojo1.7-boilerplate/index.html in your browser to view your application.

Generate a new coweb application from scratch (option #2)
$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$

You can use the convenience scripts to deploy a fresh coweb application in your virtual environment.

.. note:: A fresh, from-scratch coweb application is already created for you when deploying a Python server above. Follow these for any additional fresh coweb applications you desire.

#. If you installed the :py:mod:`coweb` package in a virtual environment, activate that environment. Otherwise, skip this step.

   .. sourcecode:: console
   
      $ source /desired/project/path/bin/activate

#. Use the :file:`pycoweb` command to create a new coweb deployment in the virtual environment root.

   .. sourcecode:: console

      $ pycoweb deploy /desired/project/path

#. Execute the generated coweb application container script to start the server.

   .. sourcecode:: console

      $ run_server.py
      $ deactivate      # to leave the virtualenv after quitting the server

By default, the script makes the contents of :file:`/desired/project/path/www` accessible at http://localhost:8080/www. Modify the :file:`/desired/project/pathbin/run_server.py` script and restart the server to make changes to these, and other, defaults. See the Python documentation section about :doc:`/python/container` for details.

Deploy only the cowebx widgets / demos (option #3)
$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$

The http://github.com/opencoweb/cowebx repository on GitHub contains the coweb example applications running at http://demos.opencoweb.org. Follow these instructions if you want to deploy the cowebx demos on your own Python server after installing the :py:mod:`coweb` Python package as described above.

#. Clone the cowebx git repository into your desired project folder or download a snapshot of it from https://github.com/opencoweb/cowebx/tarball/master.
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