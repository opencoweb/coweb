.. reviewed 0.4
.. include:: /replace.rst

Deploying cooperative web servers and applications
--------------------------------------------------

Cooperative web applications require the JavaScript components of the coweb framework and a cooperative web server to host sessions. The steps in this tutorial explain how to meet these requirements based on your preferred server language: Java or Python.

.. note:: The latest stable release of the |coweb api| is available in
   `Maven Central`_ (Java) and on `PyPI`_ (Python). You should prefer these
   packaged versions instead of branches or tarball downloads from GitHub. The
   code checked into the GitHub master repositories is considered in development
   mode, and the code may not compile or be satisfy dependencies as APIs are
   reworked. Tagged releases of
   `coweb <https://github.com/opencoweb/coweb/tags>`__,
   `cowebx <https://github.com/opencoweb/cowebx/tags>`__, and
   `coweb-boilerplates <https://github.com/opencoweb/coweb-boilerplates/tags>`__
   will always be compatible with each other.

Java setup
~~~~~~~~~~

The |coweb API| includes a Java cooperative web servlet implementation based on
the CometD Jetty code. The coweb server can run anywhere the CometD Jetty Java
code works, and will perform best under a servlet 3.0 compliant container.

The Java setup currently relies on `Apache Maven`_ 2.2.1 or higher and the
`Java SE JDK`_ 1.6 for builds. Make sure you have them installed before
continuing. You do not need to download any other coweb packages or dependencies
to get started.

Installing the Java server
##########################

There are no steps to take to install the Java server. Maven automatically
downloads the server components for you from `Maven Central`_ when you build
your coweb application for the first time.

Deploying a coweb application
#############################

There are several ways to deploy a coweb application. The quickest way to begin
developing is to generate a preconfigured application (option #1). The most
barebones method is to generate a project from scratch (option #2) allowing for
total control over every aspect of the application. Finally, one can simply
deploy the demos and go from there.

Generate a preconfigured coweb application (option #1)
$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$

The `coweb-boilerplates <http://github.com/opencoweb/coweb-boilerplates>`__
repository on GitHub contains prebuilt snapshots of developer working
environments. Follow these instructions if you want to deploy a prebuilt
snapshot of a working coweb application on your own Java server. These
instructions will also deploy cowebx widgets as well.

.. note:: The following steps assume you are using version |v boilerplate| of
   the `dojo-boilerplate` boilerplate.

#. Download a stable tagged release of coweb-boilerplates from the GitHub
   `tagged releases <https://github.com/opencoweb/coweb-boilerplates/tags>`__.
   We are using tag |tag boilerplate|.
#. Unpackage the archive. The file will be named something like
   :file:`opencoweb-coweb-boilerplates-<SHA1ID>`, where <SHAID> is the SHA1 hash
   of the specific git commit. In this tutorial, we rename the resulting
   directory to :file:`coweb-boilerplate`.
#. Run the dojo boilerplate application.

   .. sourcecode:: console

      $ cd coweb-boilerplates/dojo-boilerplate
      $ mvn jetty:run-war

By default, the `jetty:run-war` command makes your application accessible at
http://localhost:8080/dojo-boilerplate. Specify the `-Djetty.port=PORT` option
on the command line to run on a different port.

Alternatively, you can take the resulting WAR file and deploy it on the servlet
container of your choice. The generated WAR file resides in
``dojo-boilerplate/target``.

To make changes to the archetype defaults, modify the :file:`web.xml` file
created by the archetype, repackage your application, and redeploy. See the Java
documentation section about :doc:`/java/deploy` for configuration details.

.. _maven-archetype:

Generate a new coweb application from scratch (option #2)
$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$

.. note:: As of the writing of this document, the most recent version of
   `coweb-archetype` that works is 0.8.3.1. For whatever reason, the maven
   command to fetch the archetype module fetches an old version that does not
   work as well. Thus, we specify a specific version in what follows, but check
   the latest version of OpenCoweb incase 0.8.3.1 is no longer the most recent
   version.

You can seed a new cooperative web application project from scratch using the
Maven archetype for the latest version of the coweb framework.

#. Invoke the Maven command to generate a new project in the desired parent path
   of the project folder.

   .. sourcecode:: console

      $ cd /desired/project/parent/path
      $ mvn archetype:generate \
         -DarchetypeGroupId=org.opencoweb \
         -DarchetypeArtifactId=coweb-archetype \
         -DarchetypeVersion=0.8.3.1

#. Enter your desired `groupId` (e.g., `com.acme`), `artifactId` (e.g.,
   `myproject`), `version`, and `package` when prompted. Press :kbd:`Enter`
   to use any suggested default.
#. Review the information you entered and press :kbd:`Enter` to confirm.
#. Review the initial contents of your project in a subfolder matching the
   `artifactId` you selected.

   .. sourcecode:: console

      $ ls -l myproject/src/main/webapp/

After populating the project, you can package it and deploy it in-place using
the Jetty plug-in Maven.

.. sourcecode:: console

   $ cd myproject
   $ mvn clean package
   $ mvn jetty:run-war

By default, the `jetty:run-war` command makes your application accessible at
http://localhost:8080/myproject. Specify the `-Djetty.port=PORT` option on the
command line to run on a different port.

Alternatively, you can take the resulting WAR file and deploy it on the servlet
container of your choice. The generated WAR file resides in
``myproject/target``.

To make changes to the archetype defaults, modify the :file:`web.xml` file
created by the archetype, repackage your application, and redeploy. See the Java
documentation section about :doc:`/java/deploy` for configuration details.

Deploy only the cowebx widgets / demos (option #3)
$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$

The `cowebx <http://github.com/opencoweb/cowebx>`__ GitHub repository contains
the coweb example applications running at http://demos.opencoweb.org. Follow
these instructions if you want to deploy the cowebx demos on your own Java
server.

#. Download a stable tagged release of cowebx from the GitHub
   `tagged releases <https://github.com/opencoweb/cowebx/tags>`__.

#. Use Maven to package and install the `cowebx` submodules.

   .. sourcecode:: console

      $ cd cowebx/cowebx-apps
      $ mvn package

#. Use Maven to deploy `cowebx-apps`.

   .. sourcecode:: console

      $ cd cowebx-apps/launcher
      $ mvn jetty:run-war

#. Visit http://localhost:8080/cowebx-apps in your browser to view the list of
   demos.

#. You can optionally deploy individual cowebx applications by navigating to the
   desired application directory (e.g. :file:`cowebx/cowebx-apps/comap`) and
   deploy the WAR.

   .. sourcecode:: console

       $ cd cowebx/cowebx-apps/comap
       $ mvn jetty:run-war

Python setup
~~~~~~~~~~~~

The |coweb API| includes a Python cooperative web server implementation based on
`Tornado`_ version 2.4 or higher. The Python server requires Python 3.2 which
ships with or is easily installable on most \*nix/BSD operating systems.

.. _virtualenv-install:

Installing the Python server
############################

A Python coweb server can be deployed either in a virtual environment or
system-wide using distutils.

Installing using pip and virtualenv (option #1)
$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$

If you want to create a virtualenv containing all the pre-requisites needed to
develop and/or deploy your own coweb application, do the following:

#. Install `pip`_ 1.2.1 or higher using some automated method or manually from
   `PyPI`_.

   .. sourcecode:: console

      $ sudo easy_install pip    # works on Mac OS X 10.5+
      $ sudo apt-get install python-setuptools && \
        sudo easy_install pip    # works on Ubuntu

#. Install `virtualenv`_ 1.8.4 or higher.

   .. sourcecode:: console

      $ sudo pip install virtualenv

#. Create a virtual environment to host your coweb server.

   .. sourcecode:: console

      $ virtualenv /desired/project/path

#. Activate the environment.

   .. sourcecode:: console

      $ source /desired/project/path/bin/activate

#. Use :file:`pip` to install the latest stable :py:mod:`coweb` package from
   `PyPI`_ and its dependencies in the virtual environment.

   .. sourcecode:: console

      $ pip install OpenCoweb

#. Use the :file:`pycoweb` command to create a new coweb deployment in the
   virtual environment root.

   .. sourcecode:: console

      $ pycoweb deploy /desired/project/path

#. Execute the generated coweb application container script to start the server.

   .. sourcecode:: console

      $ run_server.py
      $ deactivate      # to leave the virtualenv after quitting the server

By default, the script makes the contents of :file:`/desired/project/path/www`
accessible at http://localhost:8080/www. Modify the
:file:`/desired/project/path/bin/run_server.py` script and restart the server to
make changes to these, and other, defaults. See the Python documentation section
about :doc:`/python/container` for details.

.. _distutils-install:

Installing using distutils (option #2)
$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$

Instead of using `pip`_, You can manually run the distutils :file:`setup.py` to
install the Python `coweb` package in your system :file:`site-packages` or the
active virtualenv. If you take this approach, you must download the framework
package from `PyPI`_ and resolve dependencies yourself (e.g., `Tornado`_).
Otherwise, the steps are the same sans use of `pip`_ and/or `virtualenv`_.

Deploying a coweb application
#############################

There are several ways to deploy a coweb application. The quickest way to begin
developing is to generate a preconfigured application (option #1). The most
barebones method is to generate a project from scratch (option #2), allowing for
total control over every aspect of the application. Finally, one can simply
deploy the demos and go from there.

Generate a preconfigured coweb application (option #1)
$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$

The http://github.com/opencoweb/coweb-boilerplates repository on GitHub contains
prebuilt snapshots of developer working environments. Follow these instructions
if you want to deploy a prebuilt snapshot of a working coweb application on your
Python server.

.. note:: The following steps assume you are using version |v boilerplate| of
   the `dojo-boilerplate` boilerplate.

#. Clone the coweb-boilerplates git repository into your desired project folder
   or download a tagged snapshot of it from
   https://github.com/opencoweb/coweb-boilerplates/tags. We are using tag
   |tag boilerplate| so make sure to checkout this tag if you clone the git
   repository.

#. If you installed the :py:mod:`coweb` package in a virtual environment,
   activate that environment. Otherwise, skip this step.

   .. sourcecode:: console

      $ source /desired/project/path/bin/activate

#. Use the :file:`setup.py` script to deploy the demos and a server container
   script to run them.

   .. sourcecode:: console

      $ cd coweb-boilerplates/dojo-boilerplate
      $ python setup.py deploy /desired/project/path --force

   .. note:: This command will overwrite any :file:`run_server.py` script that
      already exists in :file:`/desired/project/path/bin` (e.g., if you ran
      :file:`pycoweb` previously to seed an empty application in the
      virtualenv).

#. Execute the generated coweb application container script to start the server.

   .. sourcecode:: console

      $ run_server.py
      $ deactivate      # to leave the virtualenv after quitting the server

#. Visit http://localhost:8080/dojo-boilerplate/index.html in your browser to
   view your application.

Generate a new coweb application from scratch (option #2)
$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$

You can use the included convenience scripts to deploy a fresh coweb application
in your virtual environment.

.. note:: A fresh, from-scratch coweb application is already created for you
   when deploying a Python server above. Follow these instructions for any
   additional fresh coweb applications you wish to generate.

#. If you installed the :py:mod:`coweb` package in a virtual environment,
   activate that environment. Otherwise, skip this step.

   .. sourcecode:: console
   
      $ source /desired/project/path/bin/activate

#. Use the :file:`pycoweb` command to create a new coweb deployment in the
   virtual environment root.

   .. sourcecode:: console

      $ pycoweb deploy /desired/project/path

#. Execute the generated coweb application container script to start the server.

   .. sourcecode:: console

      $ run_server.py
      $ deactivate      # to leave the virtualenv after quitting the server

By default, the script makes the contents of :file:`/desired/project/path/www`
accessible at http://localhost:8080/www. Modify the
:file:`/desired/project/path/bin/run_server.py` script and restart the server to
make changes to these, and other, defaults. See the Python documentation section
about :doc:`/python/container` for details.

Deploy only the cowebx widgets / demos (option #3)
$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$

The http://github.com/opencoweb/cowebx repository on GitHub contains the coweb
example applications running at http://demos.opencoweb.org. Follow these
instructions if you want to deploy the cowebx demos on your own Python server
after installing the :py:mod:`coweb` Python package as described above.

#. Clone the cowebx git repository into your desired project folder or download
   a tagged snapshot of it from https://github.com/opencoweb/cowebx/tags. If you
   clone the repository, make sure to checkout a tagged version instead. Using
   the master branch may not work, since it contains actively developed code
   that may not work.

#. If you installed the :py:mod:`coweb` package in a virtual environment,
   activate that environment. Otherwise, skip this step.

   .. sourcecode:: console
   
      $ source /desired/project/path/bin/activate

#. Use the :file:`setup.py` script to deploy the demos and a server container
   script to run them. Replace <APP> with the desired demo application to
   deploy (i.e., comap, coedit, ...).

   .. sourcecode:: console
   
      $ cd cowebx/cowebx-apps
      $ ./setup.py -a <APP> -p /desired/project/path --force deploy

   .. note:: This command will overwrite any :file:`run_server.py` script that
      already exists in :file:`/desired/project/path/bin` (e.g., if you ran
      :file:`pycoweb` previously to seed an empty application in the
      virtualenv).

#. Execute the generated coweb application container script to start the server.

   .. sourcecode:: console

      $ run_server.py
      $ deactivate      # to leave the virtualenv after quitting the server

#. Visit http://localhost:8080/APP/index.html in your browser to view
   the list of demos.

