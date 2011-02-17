#!/bin/bash
COMETD_URL="http://download.cometd.org/cometd-2.1.0-distribution.tar.gz"
OAAHUB_URL="http://superb-sea2.dl.sourceforge.net/project/openajaxallianc/OpenAjaxHub/OpenAjaxHub1.0_build117_v1.0/OpenAjaxHub1.0_build117_v1.0.zip"
REQUIREJS_URL="http://requirejs.org/docs/release/0.23.0/minified/require.js"
COMETD_TAR="cometd-2.1.0-distribution.tar.gz"
OAAHUB_ZIP="OpenAjaxHub1.0_build117_v1.0.zip"
DOJO_WAR_PATH="cometd-2.1.0/cometd-javascript/dojo/target/cometd-javascript-dojo-2.1.0.war"
OAAHUB_PATH="OpenAjaxHub1.0_build117_v1.0/release/OpenAjax.js"
CURL_PATH="which curl"
WGET_PATH="which wget"
SCRIPT_PATH="$( cd "$( dirname "$0" )" && pwd )"
if [ -z $1 ]; then
    echo "usage: setup_js.sh <abspath_to_www_root>"
    exit 255
else
    SRC_PATH=`cd $1 && pwd`
    if [ -z "$SRC_PATH" ]; then
        echo "error: web root path does not exist"
        exit 1
    fi
fi

if [ ! -f "$SCRIPT_PATH/$COMETD_TAR" ]; then
    # download the latest release
    if $CURL_PATH; then
        curl $COMETD_URL > "$SCRIPT_PATH/$COMETD_TAR"
        curl $OAAHUB_URL > "$SCRIPT_PATH/$OAAHUB_ZIP"
    elif $WGET_PATH; then
        wget $COMETD_URL -O "$SCRIPT_PATH/$COMETD_TAR"
        wget $OAAHUB_URL -O "$SCRIPT_PATH/$OAAHUB_ZIP"
    else
        echo "error: curl or wget not available"
        exit 1
    fi
fi

if [ ! -f "$SCRIPT_PATH/$OAAHUB_ZIP" ]; then
    # download the latest release
    if $CURL_PATH; then
        curl $OAAHUB_URL > "$SCRIPT_PATH/$OAAHUB_ZIP"
    elif $WGET_PATH; then
        wget $OAAHUB_URL -O "$SCRIPT_PATH/$OAAHUB_ZIP"
    else
        echo "error: curl or wget not available"
        exit 1
    fi
fi

# download the latest release
if $CURL_PATH; then
    curl $REQUIREJS_URL > "$SCRIPT_PATH/require.js"
elif $WGET_PATH; then
    wget $REQUIREJS_URL -O "$SCRIPT_PATH/require.js"
else
    echo "error: curl or wget not available"
    exit 1
fi

# go to temp folder
WORK_PATH=`mktemp -d -t coweb`
# unpack cometd
tar xzf "$SCRIPT_PATH/$COMETD_TAR" -C "$WORK_PATH"
# unpack oaa hub
unzip "$SCRIPT_PATH/$OAAHUB_ZIP" -d "$WORK_PATH"

echo "progress: working in $WORK_PATH"
cd "$WORK_PATH"
# unpack the cometd js resources needed
unzip -q "$DOJO_WAR_PATH"
# move portions needed into www folder
# only overwrite what we need to, try to preserve everything else
mkdir "${SRC_PATH}/libs"
mkdir "${SRC_PATH}/libs/org"
rm -r "${SRC_PATH}/libs/org/cometd"
mv org/cometd "${SRC_PATH}/libs/org"
mv org/cometd.js "${SRC_PATH}/libs/org/cometd"
mv "${OAAHUB_PATH}" "${SRC_PATH}/libs/org"
mv "${SCRIPT_PATH}/require.js" "${SRC_PATH}/libs/"

# cleanup temp path
rm -r "$WORK_PATH"

echo "done: created org/cometd and dojox/cometd in ${SRC_PATH}/libs"