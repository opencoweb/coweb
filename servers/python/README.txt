Quick Install
=============

To install the coweb server dependencies and minified coweb JavaScript into a virtualenv, do the following. These steps assume you have virtualenv 1.5.1 or higher installed:

   cd servers/python
   virtualenv /some/path
   source /some/path/bin/activate
   ./setup.py deploy /some/path

Place your coweb application in /some/path/www and visit http://localhost:9000/www/ in your browser. Edit /some/path/bin/run_server.py to customize the server settings.

For more information, see http://opencoweb.org/ocwdocs/.