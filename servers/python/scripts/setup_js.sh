#!/bin/bash
DOWNLOAD_URL="http://download.cometd.org/cometd-2.1.0.beta2-distribution.tar.gz"
COMETD_TAR="cometd-2.1.0.beta2-distribution.tar.gz"
DOJO_WAR_PATH="cometd-2.1.0.beta2/cometd-javascript/dojo/target/cometd-javascript-dojo-2.1.0.beta2.war"
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
        curl $DOWNLOAD_URL > "$SCRIPT_PATH/$COMETD_TAR"
    elif $WGET_PATH; then
        wget $DOWNLOAD_URL -O "$SCRIPT_PATH/$COMETD_TAR"
    else
        echo "error: curl or wget not available"
        exit 1
    fi
fi

# go to temp folder
WORK_PATH=`mktemp -d -t coweb`

# unpack it
tar xzf "$SCRIPT_PATH/$COMETD_TAR" -C "$WORK_PATH"

echo "progress: working in $WORK_PATH"
cd "$WORK_PATH"
# unpack the JS resources needed
unzip -q "$DOJO_WAR_PATH"
# move portions needed into www folder
# only overwrite what we need to, try to preserve everything else
mkdir "${SRC_PATH}/libs"
mkdir "${SRC_PATH}/libs/dojox"
rm -r "${SRC_PATH}/libs/dojox/cometd"
mv dojox/cometd.js "${SRC_PATH}/libs/dojox"
mv dojox/cometd "${SRC_PATH}/libs/dojox"
rm -r "${SRC_PATH}/libs/org/cometd"
mkdir "${SRC_PATH}/libs/org"
mv org/cometd.js "${SRC_PATH}/libs/org"
mv org/cometd "${SRC_PATH}/libs/org"

# cleanup temp path
rm -r "$WORK_PATH"

echo "done: created org/cometd and dojox/cometd in ${SRC_PATH}/libs"