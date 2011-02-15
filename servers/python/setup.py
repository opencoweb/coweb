#!/usr/bin/env python
'''
Install script for coweb server framework files.

Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
from distutils.core import setup

setup(name='OpenCoweb',
    version='0.4',
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
    package_data={
        'coweb': [
            'scripts/*.tmpl', 
            'templates/*.html'
        ]
    },
    scripts=['scripts/pycoweb']
)