.. reviewed 0.4
.. include:: /replace.rst
.. default-domain:: py

Deployment descriptors
----------------------

A Java coweb server instance typically consists of an admin servlet acting as a directory of running sessions and a CometD servlet governing session events bundled into a web application archive (WAR). Configuration of both servlets is driven by standard web deployment descriptors (i.e., :file:`web.xml` files).

The generation of deployment descriptors for new coweb applications requires:

#. The installation of the coweb Maven modules.
#. The use of the Maven :file:`coweb-archetype`.

Both of these requirements are satisfied by the various Maven build scripts included in the source distribution and documented under :doc:`/tutorial/install`.

Generating a deployment descriptor
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

To generate a deployment descriptor for a new coweb project, use the Maven `coweb-archetype` as described in the :ref:`maven-archetype` section.

This archetype produces a deployment descriptor under :file:`src/main/webapp/WEB-INF.web.xml` in the project directory. The generated file configures one `org.coweb.servlet.AdminServlet`_ and one `org.cometd.server.CometdServlet`_ managing any number of independent sessions.

.. sourcecode:: xml

   <?xml version="1.0" encoding="UTF-8"?>
   <web-app xmlns="http://java.sun.com/xml/ns/javaee"
            xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
            xsi:schemaLocation="http://java.sun.com/xml/ns/javaee http://java.sun.com/xml/ns/javaee/web-app_2_5.xsd"
            version="2.5">

       <servlet>
           <servlet-name>cometd</servlet-name>
           <servlet-class>org.cometd.server.CometdServlet</servlet-class>
           <init-param>
               <param-name>logLevel</param-name>
               <param-value>0</param-value>
           </init-param>
           <init-param>
               <param-name>timeout</param-name>
               <param-value>30000</param-value>
           </init-param>
           <init-param>
               <param-name>jsonDebug</param-name>
               <param-value>false</param-value>
           </init-param>
           <async-supported>true</async-supported>
           <load-on-startup>1</load-on-startup>
       </servlet>
       <servlet-mapping>
           <servlet-name>cometd</servlet-name>
           <url-pattern>/cometd/*</url-pattern>
       </servlet-mapping>

       <servlet>
           <servlet-name>admin</servlet-name>
           <servlet-class>org.coweb.servlet.AdminServlet</servlet-class>
           <load-on-startup>2</load-on-startup>
       </servlet>
       <servlet-mapping>
           <servlet-name>admin</servlet-name>
           <url-pattern>/admin/*</url-pattern>
       </servlet-mapping>
   </web-app>

Configuring CometD options
~~~~~~~~~~~~~~~~~~~~~~~~~~

The CometD servlet accepts all of the `CometD 2 Java Server configuration`_ options. The defaults are acceptable for coweb applications in most situations. If you are developing locally, you may wish to set the `maxSessionsPerBrowser` option to `-1` to allow any number of local tabs or windows from the same browser to join the session without delay.

.. sourcecode:: xml

   <init-param>
      <param-name>maxSessionsPerBrowser</param-name>
      <param-value>-1</param-value>
   </init-param>

Configuring coweb options
~~~~~~~~~~~~~~~~~~~~~~~~~

The admin servlet accepts the following parameters configuring custom session management and security policies.

delegateClass
   String name of a `org.coweb.SessionHandlerDelegate`_ subclass to use instead of the default `org.coweb.CollabDelegate`_ which governs the coweb protocol in a session.

securityClass
   String name of a :class:`org.coweb.CowebSecurityPolicy` subclass to use instead of the base class which allows anonymous access to all sessions. 

updaterTypeMatcherClass
   String name of a :class:`org.coweb.UpdaterTypeMatcher` subclass to use to match an Updater Type for a late joiner.

Use cases
~~~~~~~~~

The following examples demonstrate how deployment descriptor options enable alternative server configurations.

Custom session security
#######################

Say a certain app deployment requires the coweb server to control user access to sessions and their abilities in the session. The admin servlet is configured with custom session delegate and security policy handlers to provide this level of control.

.. sourcecode:: xml

   <servlet>
      <servlet-name>admin</servlet-name>
      <servlet-class>org.coweb.servlet.AdminServlet</servlet-class>
      <load-on-startup>2</load-on-startup>
      <init-param>
         <param-name>delegateClass</param-name>
         <param-value>org.someorg.CustomSessionDelegate</param-value>
      </init-param>
      <init-param>
         <param-name>securityClass</param-name>
         <param-value>org.someorg.CustomSecurityPolicy</param-value>
      </init-param>
      <init-param>
         <param-name>updaterTypeMatcherClass</param-name>
         <param-value>org.someorg.CustomUpdaterTypeMatcher</param-value>
      </init-param>
   </servlet>