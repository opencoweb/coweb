Modules
    coweb-bots Contains interfaces for building your own bot.
    coweb-server Coweb server infrastructure.
    coweb-javascript Contains all the coweb javascript including dojo.
    coweb-archetype Maven architype for creating your own coweb webapp.
                    includes dojo, cometd jars and js, coweb jars and js
                    and jetty jars required by cometd.

Build Instructions.

1. mvn install 

    This will put all the coweb modules in your local maven repository

2. Start your own coweb application.

    mvn archetype:create \
    -DgroupId=<your groupId> \
    -DartifactId=<your artifactId> \
    -DcowebVersion=<current version> \
    -DarchetypeVersion=<current version> \
    -DarchetypeGroupId=org.coweb \
    -DarchetypeArtifactId=coweb-archetype