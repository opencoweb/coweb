#!/bin/bash
OPWD=$PWD
mvn -Dgpg.passphrase=$1 clean source:jar javadoc:jar install gpg:sign
mkdir bundles
MODULES="
.
coweb-admin
coweb-admin/admin-jar
coweb-admin/admin-archetype
coweb-archetype
coweb-bots
coweb-javascript
coweb-server
"
for MODULE in $MODULES; do
    TARGET="$OPWD/$MODULE/target"
    NAME=`basename $MODULE`
    if [[ $NAME == '.' ]]; then
        NAME='coweb'
    fi
    JAR="$OPWD/bundles/$NAME.bundle.jar"
    cd $TARGET
    jar cvf "$JAR" *.pom *.asc *.war *.jar
done
