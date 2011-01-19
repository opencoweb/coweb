#!/usr/bin/env python
'''
Install script for a virtualenv with a coweb server hosting the JS framework
with room for your own apps.

Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
import virtualenv
import os
import shutil
import subprocess

class Bag(object): pass

class EmptyInstall(object):
    def install_prereqs(self, paths):
        # install Python requirements
        subprocess.call([paths.pip, 'install', '-r', 'requirements.txt'])

    def install_coweb(self, paths):
        # run setup_js.sh pointing to home_dir/www
        if subprocess.call(['scripts/setup_js.sh', paths.www]):
            raise RuntimeError('could not install JS dependencies')
        # copy www/libs/coweb into home_dir/www/libs
        shutil.copytree('../../www/libs/coweb', os.path.join(paths.www, 'libs', 'coweb'))
        shutil.copy('../../www/libs/coweb.js', os.path.join(paths.www, 'libs'))
        # copy bots into home_dir/bots
        shutil.copytree('bots', paths.bots)
    
    def after_install(self, options, home_dir):
        # paths
        paths = Bag()
        paths.www = os.path.join(home_dir, 'www')
        paths.bots = os.path.join(home_dir, 'bots')
        paths.bin = os.path.join(home_dir, 'bin')
        paths.pycoweb = os.path.join(paths.bin, 'pycoweb')
        paths.app = os.path.join(paths.bin, 'run_server.py')
        paths.pip = pip = os.path.join(paths.bin, 'pip')

        # delegate prereq install
        self.install_prereqs(paths)
    
        # clean out old www, bots
        shutil.rmtree(paths.www, True)
        shutil.rmtree(paths.bots, True)
        # make www/libs in home_dir
        os.makedirs(os.path.join(paths.www, 'libs'))

        # delegate coweb install
        self.install_coweb(paths)

        # write configured run_server.py in home_dir/bin
        if not subprocess.call([paths.pycoweb, 'init', '-o', paths.app, '-v']):
            # fix the http static path and bot dir in the template
            lines = file(paths.app, 'r').readlines()
            lines.insert(32, "        self.httpStaticPath = '../www'\n")
            lines.insert(57, "        self.cowebBotLocalPaths[0] = '../bots'\n")
            file(paths.app, 'w').write(''.join(lines))

    def adjust_options(self, options, args):
        # force no site packages
        options.no_site_packages = True

def run(inst):
    virtualenv.after_install = inst.after_install
    virtualenv.adjust_options = inst.adjust_options
    virtualenv.main()    

if __name__ == '__main__':
    inst = EmptyInstall()
    run(inst)