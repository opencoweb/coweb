#!/usr/bin/env python
'''
Install script for a virtualenv with a coweb server hosting the JS framework
and coweb demos.

Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
import setup_emptyenv
import os
import subprocess
import shutil

class DemoInstall(setup_emptyenv.EmptyInstall):
    def install_coweb(self, paths):
        # normal copy install
        super(DemoInstall, self).install_coweb(paths)
        # copy examples too
        shutil.copytree('../../www/examples', os.path.join(paths.www, 'examples'))

if __name__ == '__main__':
    inst = DemoInstall()
    setup_emptyenv.run(inst)