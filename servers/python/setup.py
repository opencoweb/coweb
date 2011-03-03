#!/usr/bin/env python
'''
Install script for coweb server framework files.

Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
from distutils.core import setup
import os

VERSION = '0.4'

# collect js release as data files
cowebJSFiles = []
shareDir = 'share/coweb/js/coweb-%s' % VERSION
srcDir = os.path.join(os.environ['PWD'], '../../js/release/coweb-%s' % VERSION)
for d, sd, fs in os.walk(srcDir):
    for fn in fs:
        sd = d[len(srcDir)+1:]
        path = os.path.join(shareDir, sd)
        cowebJSFiles.append((path, [os.path.join(d, fn)]))

setup(name='OpenCoweb',
    version=VERSION,
    description='Tornado-based Python server for the Open Cooperative Web Framework',
    url='http://github.com/opencoweb',
    license='New BSD License / Academic Free License',
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
        'coweb.session',
    ],
    data_files = cowebJSFiles,
    package_data={
        'coweb': [
            'scripts/*.tmpl', 
            'templates/*.html'
        ]
    },
    scripts=['pycoweb']
)