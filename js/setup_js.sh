#!/bin/bash
COMETD_VERSION="2.4.0"
REQUIREJS_VERSION="0.24.0"
OAAHUB_VERSION="1.0_build117_v1.0"

COMETD_URL="http://download.cometd.org/cometd-${COMETD_VERSION}-distribution.tar.gz"
OAAHUB_URL="http://iweb.dl.sourceforge.net/project/openajaxallianc/OpenAjaxHub/OpenAjaxHub${OAAHUB_VERSION}/OpenAjaxHub${OAAHUB_VERSION}.zip"
REQUIREJS_URL="http://requirejs.org/docs/release/${REQUIREJS_VERSION}/minified/require.js"
REQUIREJS_SRC_URL="http://requirejs.org/docs/release/${REQUIREJS_VERSION}/requirejs-${REQUIREJS_VERSION}.zip"
COMETD_TAR="cometd-${COMETD_VERSION}-distribution.tar.gz"
OAAHUB_ZIP="OpenAjaxHub${OAAHUB_VERSION}.zip"
REQUIREJS_ZIP="requirejs-${REQUIREJS_VERSION}.zip"
DOJO_WAR_PATH="cometd-${COMETD_VERSION}/cometd-javascript/dojo/target/cometd-javascript-dojo-${COMETD_VERSION}.war"
OAAHUB_PATH="OpenAjaxHub${OAAHUB_VERSION}/release/OpenAjax.js"
COMETD_PATH="org/cometd.js"
COMETDACK_PATH="org/cometd/AckExtension.js"
REQUIREJS_PATH="requirejs-${REQUIREJS_VERSION}"
CURL_PATH="which curl"
WGET_PATH="which wget"
SCRIPT_PATH="$( cd "$( dirname "$0" )" && pwd )"
LIB_PATH="$SCRIPT_PATH/lib"
BUILD_PATH="$SCRIPT_PATH/build"
TMP_PATH="$SCRIPT_PATH/tmp"

function fetch () {
    echo "progress: fetching $1 ..."
    if $CURL_PATH; then
        curl "$1" > "$2"
    elif $WGET_PATH; then
        wget "$1" -O "$2"
    else
        echo "error: curl or wget not available"
        exit 1
    fi
}

# make tmp folder
if [ ! -d "$TMP_PATH" ]; then
    mkdir "$TMP_PATH"
fi

# fetch cometd if not fetched
if [ ! -f "$TMP_PATH/$COMETD_TAR" ]; then
    fetch "$COMETD_URL" "$TMP_PATH/$COMETD_TAR"
fi

# fetch oaa hub if not fetched
if [ ! -f "$TMP_PATH/$OAAHUB_ZIP" ]; then
    fetch "$OAAHUB_URL" "$TMP_PATH/$OAAHUB_ZIP"
fi

# fetch minified require.js always in case of version change
fetch "$REQUIREJS_URL" "$TMP_PATH/require.js"

# fetch require.js source bundle for optimizer if not fetched
if [ ! -f "$TMP_PATH/" ]; then
    fetch "$REQUIREJS_SRC_URL" "$TMP_PATH/$REQUIREJS_ZIP"
fi


# go to temp folder
WORK_PATH=`mktemp -d -t cowebXXXXXX`
# unpack cometd
tar xzf "$TMP_PATH/$COMETD_TAR" -C "$WORK_PATH"
# unpack oaa hub
unzip "$TMP_PATH/$OAAHUB_ZIP" -d "$WORK_PATH"
# unpack requirejs
unzip "$TMP_PATH/$REQUIREJS_ZIP" -d "$WORK_PATH"

echo "progress: working in $WORK_PATH"
cd "$WORK_PATH"

# unpack the cometd js resources needed
unzip -q "$DOJO_WAR_PATH"

# wrap oaa hub for amd
echo "define(function () {" > amd
cat "$OAAHUB_PATH" >> amd
echo "return OpenAjax;
});" >> amd
mv amd "$OAAHUB_PATH"

# wrap cometd for amd
echo "define(function () {
if (typeof dojo !== 'undefined' && !dojo.provide) { dojo.provide = function() {}; this.org = this.org || {}; org.cometd = {}; }" > amd
cat "$COMETD_PATH" >> amd
cat "$COMETDACK_PATH" >> amd
echo "return org.cometd;
});" >> amd
mv amd "$COMETD_PATH"

# move portions needed into www folder
# only overwrite what we need to, try to preserve everything else
rm -r "${LIB_PATH}/org"
mkdir "${LIB_PATH}/org"
mv "${COMETD_PATH}" "${LIB_PATH}/org/"
mv "${OAAHUB_PATH}" "${LIB_PATH}/org/"
cp "${TMP_PATH}/require.js" "${LIB_PATH}/"
mv "${REQUIREJS_PATH}" "${BUILD_PATH}/"

# cleanup temp path
rm -r "$WORK_PATH"

echo "done: put dependencies in ${LIB_PATH} and ${BUILD_PATH}"
