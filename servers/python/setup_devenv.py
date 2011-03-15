#!/usr/bin/env python
'''
Install script for a virtualenv with all web resources symlinked to this source
directory for framework development purposes.

Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
import virtualenv
import os
import shutil
import subprocess

def after_install(options, home_dir):    
    # paths
    www = os.path.join(home_dir, 'www')
    bin = os.path.join(home_dir, 'bin')
    pycoweb = os.path.join(bin, 'pycoweb')
    pip = os.path.join(bin, 'pip')

    # install latest tornado from git
    subprocess.check_call([pip, 'install', '-e', 'git+https://github.com/facebook/tornado.git#egg=Tornado'])
    # install coweb
    subprocess.check_call([pip, 'install', '-e', '.'])

    # create an empty deployment
    subprocess.check_call([pycoweb, 'deploy', home_dir, '--no-js', '--force'])

    # run setup_js.sh
    if subprocess.call(['../../js/setup_js.sh']):
        raise RuntimeError('could not install JS dependencies')
    try:
        os.makedirs(os.path.join(www, 'lib'))
    except OSError:
        pass
    # symlink js/lib/*coweb into home_dir/www/lib/*
    lib = os.path.abspath('../../js/lib/org')
    os.symlink(lib, os.path.join(www, 'lib/org'))
    lib = os.path.abspath('../../js/lib/coweb')
    os.symlink(lib, os.path.join(www, 'lib/coweb'))
    lib = os.path.abspath('../../js/lib/require.js')
    os.symlink(lib, os.path.join(www, 'lib/require.js'))
    # symlink tests into home_dir/www
    src = os.path.abspath('../../js/test/')
    os.symlink(src, os.path.join(www, 'test'))

def adjust_options(options, args):
    # force no site packages
    options.no_site_packages = True

def run():
    virtualenv.after_install = after_install
    virtualenv.adjust_options = adjust_options
    virtualenv.main()

if __name__ == '__main__':
    run()