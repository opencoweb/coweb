#!/bin/bash

SCRIPT_PATH="$( cd "$( dirname "$0" )" && pwd )"
COWEB_JAVASCRIPT_PATH="$SCRIPT_PATH/../servers/java/coweb-javascript"
LIB_PATH="$SCRIPT_PATH/lib"
BUILD_PATH="$SCRIPT_PATH/build"
TMP_PATH="$SCRIPT_PATH/tmp"

#./requirejs-*/build/build.sh coweb.build.js
#VERSION=`grep VERSION ../servers/java/coweb-javascript/src/main/webapp/coweb/main.js`
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

# The following is outdated - this is when the JavaScript code was pulled from coweb/js/lib/coweb.
# Now, the JavsScript OCW code is pulled from its maven repo in servers/java/coweb-javascript.

#cp -r $COWEB_JAVASCRIPT_PATH/target/coweb-javascript-${VERSION}/org ./release/coweb-${VERSION}/
#rm -r ../release/coweb-src-${VERSION}
#cp -r ../lib/* ../release/coweb-src-${VERSION}
#cp ../../NOTICES ../release/coweb-src-${VERSION}
#cp ../../LICENSE ../release/coweb-src-${VERSION}
# move portions needed into www folder
# only overwrite what we need to, try to preserve everything else
#rm -r "${LIB_PATH}/org"
#mkdir "${LIB_PATH}/org"
#mv "${COMETD_PATH}" "${LIB_PATH}/org/"
#mv "${OAAHUB_PATH}" "${LIB_PATH}/org/"
#cp "${TMP_PATH}/require.js" "${LIB_PATH}/"
#mv "${REQUIREJS_PATH}" "${BUILD_PATH}/"

# cleanup temp path
#rm -r "$WORK_PATH"

#echo "done: put dependencies in ${LIB_PATH} and ${BUILD_PATH}"
