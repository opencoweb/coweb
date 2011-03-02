#!/usr/bin/env python
'''
Install script for a virtualenv with all web resources symlinked to this source
directory for framework development purposes.

Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
import setup_emptyenv
import os
import shutil
import subprocess

class DevInstall(setup_emptyenv.EmptyInstall):
    def install_prereqs(self, paths):
        # install latest tornado from git
        subprocess.call([paths.pip, 'install', '-e', 'git+https://github.com/facebook/tornado.git#egg=Tornado'])
        # install Python coweb
        subprocess.call([paths.pip, 'install', '-e', '.'])

    def install_coweb(self, paths):
        # run setup_js.sh
        if subprocess.call(['../../js/setup_js.sh', paths.www]):
            raise RuntimeError('could not install JS dependencies')
        # symlink js/lib into home_dir/www/lib
        lib = os.path.abspath('../../js/lib/')
        os.symlink(os.path.join(lib, 'coweb'), os.path.join(paths.www, 'lib'))
        # symlink tests into home_dir/www
        src = os.path.abspath('../../js/test/')
        os.symlink(src, os.path.join(paths.www, 'test'))

if __name__ == '__main__':
    inst = DevInstall()
    setup_emptyenv.run(inst)