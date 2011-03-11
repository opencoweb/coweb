Setup Environment.

1. Get geronimo 2.2.1 with jetty http://geronimo.apache.org/apache-geronimo-v221-release.html

2. Install and start geronimo.

3. Place users.properties and groups.properties in the geronimo home dir.

4. Login into console.  localhost:8080/console  username system password manager

5. Go to "Security Realms" and create a new security realm.

    name: pbs
    realm type: properties file realm

    use the users.properties file and groups.properties file provided.

6. Go to Embedded DB and run the contens of derby_tables.sql against the db 
   "SystemDatabase".

7. Build and deploy.

    from PBS dir.  mvn install
    <GERONIMO_HOME>/bin/deploy.sh deploy admin-ear/target/admin-ear-1.0.ear
    <GERONIMO_HOME>/bin/deploy.sh deploy apps/comap/target/comap.war
