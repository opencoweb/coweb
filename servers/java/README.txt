Modules
    coweb_bots Contains interfaces for building your own bot.
    coweb_server Coweb server infrastructure.
    coweb_javascript Contains all the coweb javascript including dojo.
    coweb_archetype Maven architype for creating your own coweb webapp.
                    includes dojo, cometd jars and js, coweb jars and js
                    and jetty jars required by cometd.
    coweb_example Contains two demos /coweb_example/comap and 
                  /coweb_example/colist

Build Instructions.

1. mvn install 
    This will put all the coweb modules in your local maven repository

2. Run the example.
    cd coweb_example
    mvn jetty:run-war
    point your web browser to http://localhost:8080/coweb_example/comap or
    http://localhost:8080/coweb_example/colist

    or copy coweb_example/target/coweb_example.war into your own servlet
    container.

Once the coweb modules are installed in your local repository you can create 
your own coweb webapp with the following command.

mvn archetype:create \
-DgroupId=<your groupId> \
-DartifactId=<your artifactId> \
-DcowebVersion=.1 \
-DarchetypeVersion=.1 \
-DarchetypeGroupId=org.coweb \
-DarchetypeArtifactId=coweb_archetype
