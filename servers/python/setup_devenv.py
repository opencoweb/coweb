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
        # run setup_js.sh pointing to home_dir/www
        if subprocess.call(['scripts/setup_js.sh', paths.www]):
            raise RuntimeError('could not install JS dependencies')
        # symlink www/libs/coweb into home_dir/www/libs
        libs = os.path.abspath('../../www/libs/')
        os.symlink(os.path.join(libs, 'coweb'), os.path.join(paths.www, 'libs', 'coweb'))
        os.symlink(os.path.join(libs, 'coweb.js'), os.path.join(paths.www, 'libs', 'coweb.js'))
        # symlink examples into home_dir/www
        exs = os.path.abspath('../../www/examples/')
        os.symlink(exs, os.path.join(paths.www, 'examples'))
        # symlink tests into home_dir/www
        exs = os.path.abspath('../../www/tests/')
        os.symlink(exs, os.path.join(paths.www, 'tests'))
        # symlink bots into home_dir/bots
        bots = os.path.abspath('bots')
        try:
            os.remove(paths.bots)
        except OSError:
            pass
        os.symlink(bots, paths.bots)

if __name__ == '__main__':
    inst = DevInstall()
    setup_emptyenv.run(inst)