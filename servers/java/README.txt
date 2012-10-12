Quick Install
=============

1. Install the coweb modules into your local maven repository.

   cd servers/java
   mvn install

2. Generate your own coweb application from an archetype.

   cd /path/to/my/project
   mvn archetype:generate 
      -DarchetypeGroupId=org.opencoweb 
      -DarchetypeArtifactId=coweb-archetype
   
3. Change the defaults for the generated project as desired.

Maven Modules
=============

coweb-admin
   Optional coweb session administration. (in development)

coweb-client
   Pure Java client. (in development, not currently finished)

coweb-archetype 
   Archetype for creating your own coweb webapp.
   
coweb-bots
   Contains interfaces for building your own bot.

coweb-javascript
   Contains the latest stable release copy of the coweb framework JavaScript.

coweb-server 
   Coweb server infrastructure.

coweb-operationengine
   Coweb Java operation engine implementation.

Eclipse/WTP
===========

The WAR output of the coweb-build maven module can be easily imported into an Eclipse/WTP
Environment.

1) Ensure step 1 of the Quick Install has been performed.

2) Open Eclipse and via File->Import perform a "Web->War File" import of the
"coweb-build-x.x.war" found in the "coweb/servers/java/coweb-build/target" directory.

3) Add the Web Project to a WTP Server instance. If this is a Servlet 3.0 runtime
   ensure that

    <!--async-supported>true</async-supported> -->

   is uncommented in the projects web.xml.

4) Start the WTP Server instance and access the sample code via
   (Assumes the name context root used for the web project is "/coweb-test")

"http://localhost:8080/coweb-test/index.html"

5) In the browsers console you should see coweb status updates logged.
