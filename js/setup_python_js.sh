#!/bin/bash

SCRIPT_PATH="$( cd "$( dirname "$0" )" && pwd )"
COWEB_JAVASCRIPT_PATH="$SCRIPT_PATH/../servers/java/coweb-javascript"

#./requirejs-*/build/build.sh coweb.build.js
VERSION=`grep VERSION $COWEB_JAVASCRIPT_PATH/src/main/webapp/coweb/main.js`
VERSION=${VERSION#*\'}
VERSION=${VERSION%\'*}

cd $COWEB_JAVASCRIPT_PATH
mvn clean package
cd $SCRIPT_PATH

echo $VERSION
rm -rf ./release/coweb-${VERSION}
mkdir ./release/coweb-${VERSION}
cp ../NOTICES ./release/coweb-${VERSION}
cp ../LICENSE ./release/coweb-${VERSION}

cp -r $COWEB_JAVASCRIPT_PATH/target/coweb-javascript-${VERSION}/ ./release/coweb-${VERSION}/

