
# Set up the python server environment, but the coweb files are linked
# symbolically to the virtualenv, so that development can proceed on source
# files in the coweb repo, but testing is through the virtualenv.

WP=$VIRTUAL_ENV

if [ -z $WP ]; then
    echo "Run this script in the virtualenv \
(i.e. \`source path/to/virtualenv/bin/activate\`"
    exit 1
fi

libpath=`echo $WP/lib/python*/site-packages`

if [ ! -a $WP/bin/pycoweb ] && [ ! -h $WP/bin/pycoweb ]; then
    pip install .
fi

rm -rf $libpath/coweb $libpath/cowebpyoe $WP/bin/pycoweb
ln -s $PWD/pycoweb $WP/bin/pycoweb
ln -s $PWD/coweb $libpath/coweb

echo "Done"

