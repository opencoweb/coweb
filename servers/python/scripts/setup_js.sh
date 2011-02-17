#!/bin/bash
COMETD_URL="http://download.cometd.org/cometd-2.1.0-distribution.tar.gz"
OAAHUB_URL="http://superb-sea2.dl.sourceforge.net/project/openajaxallianc/OpenAjaxHub/OpenAjaxHub1.0_build117_v1.0/OpenAjaxHub1.0_build117_v1.0.zip"
REQUIREJS_URL="http://requirejs.org/docs/release/0.23.0/minified/require.js"
COMETD_TAR="cometd-2.1.0-distribution.tar.gz"
OAAHUB_ZIP="OpenAjaxHub1.0_build117_v1.0.zip"
DOJO_WAR_PATH="cometd-2.1.0/cometd-javascript/dojo/target/cometd-javascript-dojo-2.1.0.war"
OAAHUB_PATH="OpenAjaxHub1.0_build117_v1.0/release/OpenAjax.js"
COMETD_PATH="org/cometd.js"
COMETDACK_PATH="org/cometd.js"
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

# fetch cometd if not fetched
if [ ! -f "$SCRIPT_PATH/$COMETD_TAR" ]; then
    fetch "$COMETD_URL" "$SCRIPT_PATH/$COMETD_TAR"
fi

# fetch oaa hub if not fetched
if [ ! -f "$SCRIPT_PATH/$OAAHUB_ZIP" ]; then
    fetch "$OAAHUB_URL" "$SCRIPT_PATH/$OAAHUB_ZIP"
fi

# fetch require.js if not fetched
if [ ! -f "$SCRIPT_PATH/require.js" ]; then
    fetch "$REQUIREJS_URL" "$SCRIPT_PATH/require.js"
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

# wrap oaa hub for amd
echo "define(function () {" > amd
cat "$OAAHUB_PATH" >> amd
echo "return OpenAjax;
});" >> amd
mv amd "$OAAHUB_PATH"

# wrap cometd for amd
echo "define(function () {" > amd
cat "$COMETD_PATH" >> amd
cat "$COMETDACK_PATH" >> amd
echo "return org.cometd;
});" >> amd
mv amd "$COMETD_PATH"

# move portions needed into www folder
# only overwrite what we need to, try to preserve everything else
mkdir "${SRC_PATH}/libs"
mkdir "${SRC_PATH}/libs/org"
rm -r "${SRC_PATH}/libs/org/cometd"
mv "${COMETD_PATH}" "${SRC_PATH}/libs/org/"
mv "${OAAHUB_PATH}" "${SRC_PATH}/libs/org/"
cp "${SCRIPT_PATH}/require.js" "${SRC_PATH}/libs/"

# cleanup temp path
rm -r "$WORK_PATH"

echo "done: put dependencies in ${SRC_PATH}/libs"