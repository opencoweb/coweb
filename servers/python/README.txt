Quick Install
=============

To install the coweb server dependencies and minified coweb JavaScript into a virtualenv, do the following. These steps assume you have virtualenv 1.5.1 or higher installed:

   cd servers/python
   ./setup_emptyenv.py /env/path
   source /env/path/bin/activate
   run_server.py

Place your coweb application in /env/path/www and visit http://localhost:9000/www/ in your browser. Edit /env/path/bin/run_server.py to customize the server settings.

For more information, see http://opencoweb.org/ocwdocs/.