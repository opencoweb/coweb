==============================
Open Cooperative Web Framework
==============================

:Homepage: http://opencoweb.org
:Project page: http://dojofoundation.org/projects/opencoweb
:Code: https://github.com/opencoweb/coweb
:Documentation: http://opencoweb.org/ocwdocs
:User group: https://groups.google.com/group/opencoweb
:Dev group: https://groups.google.com/group/opencoweb-dev
:IRC: #coweb on irc.freenode.net

What is it?
===========

The Open Cooperative Web Framework enables the creation of *cooperative web applications* featuring concurrent real-time interactions among remote users and external data sources. The framework handles remote notification of user changes, the resolution of conflicting changes, and convergence of application state with minimal information from the application.

The current implementation of the framework is based on open web technologies such as Dojo, CometD, Bayeux, and WebSocket. The framework includes:

* A JavaScript API for sending and receiving coweb events
* An JavaScript *operation engine* using `operational transformation <http://en.wikipedia.org/wiki/Operational_transformation>`_ to resolve conflicting, simultaneous changes
* A Python coweb server built on the `Tornado <http://tornadowebserver.org>`_ web server
* A Java coweb server built on the `CometD <http://cometd.org>`_ Java Library
* API documentation, tutorials, and examples

Getting Started
===============

1. Download the latest stable release from https://github.com/opencoweb/coweb/downloads.
2. Read the the framework documentation online at http://opencoweb.org/ocwdocs. It includes tutorials on how to setup a coweb server and write your first cooperative web application. 
3. Send mail to the coweb users group or join us on IRC if you're having trouble.

Status and Support
==================

This is an initial code drop. You can grab the framework and start using it, but expect a bumpy ride in the near future. We're working hard on documentation and fixes to get to a stable v1.0. For more details, please refer to the issue tracker on GitHub.

**NOTE** The master branch is now working toward a v0.4 release which includes a total restructuring of the JavaScript code in AMD format and moves the coweb examples to the http://github.com/opencoweb/cowebx repository. Be aware the rendered docs at http://opencoweb.org/ocwdocs from the last stable release (v0.3) do not match what is currently in the master branch. Both will be updated when v0.4 is final.

Currently, the JavaScript portions of the coweb framework should work in the following browsers.

* Firefox 3.5+
* Safari 4+
* Chrome 5+
* IE8+
* Opera 10.50+
* Mobile Safari on iOS 4+
* Android Browser 1.6+

For our Java coweb server, we support any environment that can run a Java Servlet 3.0 compliant container (e.g., Jetty, Tomcat). For the Python server, we support any environment where Tornado can operate.

Please report an issue on GitHub if you have trouble in one of these browsers or server environments.

License
=======

Copyright (c) The Dojo Foundation 2011. All Rights Reserved.

Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.

See the LICENSE file for the terms of the OpenCoweb dual BSD/AFL license.

Packaged builds of the OpenCoweb JavaScript framework located in coweb/js/release include third-party code that is not covered under the OpenCoweb License. See the NOTICES file for details of these dependencies.

Contributing
============

The Open Cooperative Web Framework is a `Dojo Foundation project <http://dojofoundation.org/projects/opencoweb/>`_, and as such follows the `contribution directives of the Dojo Foundation <http://dojofoundation.org/about/contribute/>`_. Please read them if you wish to contribute. If you agree to their terms, feel free to fork our code and send us pull requests on GitHub.

Credits
=======

This open source project derives from a broader IBM cooperative web project. The initial IBM contribution includes efforts from the following people:

Bill Abt, Krishna Akella, Hisatoshi Adachi, David Boloker, `Paul Bouchon <http://github.com/bouchon>`_, `Brian Burns <http://github.com/bpburns>`_, `Bryce Curtis <http://github.com/brycecurtis>`_, Andrew Donoho, `Dan Gisolfi <http://github.com/vinomaster>`_, Wing Lee, `Peter Parente <http://github.com/parente>`_, Aaron Reed, `Roger Que <http://github.com/query>`_, Sonal Starr, `Michael Stewart <http://github.com/thegreatmichael>`_, Wayne Vicknair, Royce Walter, Peter Westerink

Subsequent contributors to the project under the Dojo Foundation will be credited here. 

References
==========

The operational transformation algorithm used in the framework is based on various lines of research, such as: 

* \D. Sun and C. Sun, "Operation context and context-based operational transformation," in CSCW '06: Proceedings of the 2006 20th anniversary conference on Computer supported cooperative work. New York, NY, USA: ACM Press, 2006, pp. 279-288. [Online]. Available: http://dx.doi.org/10.1145/1180875.1180918
* \D. Sun, S. Xia, C. Sun, and D. Chen, "Operational transformation for collaborative word processing," in CSCW '04: Proceedings of the 2004 ACM conference on Computer supported cooperative work. New York, NY, USA: ACM, 2004, pp. 437-446. [Online]. Available: http://dx.doi.org/10.1145/1031607.1031681
* \S. Xia, D. Sun, C. Sun, D. Chen, and H. Shen, "Leveraging single-user applications for multi-user collaboration: the coword approach," in CSCW '04: Proceedings of the 2004 ACM conference on Computer supported cooperative work.    New York, NY, USA: ACM, 2004, pp. 162-171. [Online]. Available: http://dx.doi.org/10.1145/1031607.1031635