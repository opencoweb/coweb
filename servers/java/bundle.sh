#!/bin/bash
OPWD=$PWD
read -s -p "GPG password: " KEYPASS
echo
mvn -DperformRelease=true -Dgpg.passphrase=$KEYPASS -Dmaven.artifact.gpg.keyname=9B71B7C5 clean source:jar javadoc:jar verify
if [[ $? != 0 ]]; then
    exit $?
fi
rm bundles/*
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
coweb-operationengine
coweb-build
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
