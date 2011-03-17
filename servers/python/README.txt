Quick Install
=============

To install the coweb server dependencies and minified coweb JavaScript into a virtualenv, do the following. These steps assume you have virtualenv 1.5.1 or higher installed:

   cd servers/python
   # create a virtualenv
   virtualenv /some/path
   # activate it
   source /some/path/bin/activate
   # use pip to install coweb package and dependencies
   pip install -r requirements.txt
   # deploy a coweb server container and js libs
   pycoweb deploy /some/path
   # start the server
   /some/path/bin/run_server.py

Place your coweb application in /some/path/www and visit http://localhost:8080/www/ in your browser. Edit /some/path/bin/run_server.py to customize the server settings.

For more information, see http://opencoweb.org/ocwdocs/.