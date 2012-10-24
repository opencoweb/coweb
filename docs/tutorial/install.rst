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

.. note:: The following steps assume you are using version 1.0 of the
   `dojo-boilerplate` boilerplate.

#. Download a stable tagged release of coweb-boilerplates from the GitHub
   `tagged releases <https://github.com/opencoweb/coweb-boilerplates/tags>`__.
   We are using tag v1.0.
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

#. Visit http://localhost:8080/cowebx-apps in your browser to view the list of demos.

#. You can optionally deploy individual cowebx applications by navigating to the
desired application directory (e.g. :file:`cowebx/cowebx-apps/comap`) and deploy
the WAR.

   .. sourcecode:: console

       $ cd cowebx/cowebx-apps/comap
       $ mvn jetty:run-war

Python setup
~~~~~~~~~~~~

.. The old Python install instructions have been temporarily moved to
   python_install.rst. When the Python server is brought up to date, we can use
   this file to add back in Python tutorial instructions.

The |coweb API| includes a Python version of the cooperative web server based on
`Tornado`_; however, the implementation is far out of date and no longer works.
There is an ongoing effort to bring the Python version of the server back up to
speed with the Java server, but in the meantime the Python server is not
supported.

Effort to fix the Python server
###############################

See the github issue for the status of `revamping the Python server
<https://github.com/opencoweb/coweb/issues/203>`__.


