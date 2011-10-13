#!/usr/bin/env python
'''
Install script for coweb server framework files.

Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
from distutils.core import setup
import sys
import os
import shutil
import subprocess

VERSION = '0.7'

isSDist = len(sys.argv) > 1 and sys.argv[1] == 'sdist'
srcDir = os.path.join(os.environ['PWD'], '../../js/release/coweb-%s' % VERSION)
if os.path.isdir('js') or os.path.islink('js'):
    srcDir = 'js'
elif os.path.isdir(srcDir):
    if isSDist:
        try:
            os.symlink(srcDir, 'js')
        except OSError:
            pass
        srcDir = 'js'
        # package the main README
        shutil.copy('../../README.rst', 'README')
else:
    raise RuntimeError('missing: js framework release v%s' % VERSION)

# collect js release as data files
cowebJSFiles = []
shareDir = 'share/coweb/js/coweb-%s' % VERSION
for d, sd, fs in os.walk(srcDir):
    for fn in fs:
        sd = d[len(srcDir)+1:]
        path = os.path.join(shareDir, sd)
        cowebJSFiles.append((path, [os.path.join(d, fn)]))
if not len(cowebJSFiles):
    # stable release missing, abort install
    raise RuntimeError('js/release/coweb-%s not found' % VERSION)

setup(name='OpenCoweb',
    version=VERSION,
    description='Tornado-based Python server for the Open Cooperative Web Framework',
    url='http://opencoweb.org',
    license='New BSD License / Academic Free License',
    maintainer='Dojo Foundation',
    packages=[
        'coweb',
        'coweb.access', 
        'coweb.auth', 
        'coweb.bayeux',
        'coweb.bayeux.ext',
        'coweb.bot',
        'coweb.bot.wrapper',
        'coweb.bot.wrapper.bayeux',
        'coweb.service',
        'coweb.service.launcher',
        'coweb.service.manager',
        'coweb.session',
        'coweb.updater'
    ],
    data_files = cowebJSFiles,
    package_data={
        'coweb': [
            'scripts/*.tmpl', 
            'templates/*.html'
        ]
    },
    scripts=['pycoweb'],
    install_requires=['tornado>=1.2'],
)

if isSDist:
    try:
        os.remove('js')
    except OSError:
        pass
    subprocess.call(['git', 'checkout', 'README'])