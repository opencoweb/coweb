Quick Install
=============

1. Install the coweb modules into your local maven repository.

   cd servers/java
   mvn install

2. Generate your own coweb application from an archetype.

   cd /path/to/my/project
   mvn archetype:generate 
      -DarchetypeGroupId=org.coweb 
      -DarchetypeArtifactId=coweb-archetype
   
3. Change the defaults for the generated project as desired.

Maven Modules
=============

coweb-admin
   Optional coweb session administration. (in development)

coweb-archetype 
   Archetype for creating your own coweb webapp.
   
coweb-bots
   Contains interfaces for building your own bot.

coweb-javascript
   Contains the latest stable release copy of the coweb framework JavaScript.

coweb-server 
   Coweb server infrastructure.