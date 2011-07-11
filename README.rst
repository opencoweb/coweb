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

The current implementation of the framework is based on open web technologies such as `AMD <http://wiki.commonjs.org/wiki/Modules/AsynchronousDefinition>`_, `Bayeux <http://svn.cometd.com/trunk/bayeux/bayeux.html>`_, and `WebSockets <http://en.wikipedia.org/wiki/WebSockets>`_. The framework includes:

* A JavaScript API for sending and receiving coweb events
* An JavaScript *operation engine* using `operational transformation <http://en.wikipedia.org/wiki/Operational_transformation>`_ to ensure shared state convergence
* A Python coweb server built on the `Tornado <http://tornadowebserver.org>`_ web framework
* A Java coweb server built on the `CometD <http://cometd.org>`_ Java library
* API documentation, tutorials, and examples

Getting Started
===============

Read the the framework documentation online at http://opencoweb.org/ocwdocs. It includes tutorials on how to obtain the coweb package from Maven Central or PyPI and write your first cooperative web application. 

Send mail to the coweb users group or join us on IRC if you're having trouble.

Status
======

Tagged revisions in the *master* branch are our stable releases. The docs at  http://opencoweb.org/ocwdocs match the latest stable release.

The *opencoweb/coweb/master* branch on GitHub contains the framework code progressing toward the next stable release. We increment the version number in the code immediately after tagging a stable release so it reflects our next intended stable version.

The *opencoweb/cowebx/master* branch on GitHub contains example applications and widgets using the framework. We do not plan to make stable releases of the examples. Instead we will attempt to keep them working with all versions of the framework version 0.4 or higher.

All APIs are subject to change until we hit a v1.0 milestone.

Support
=======

Currently, the JavaScript portions of the coweb framework should work in the following browsers.

* Firefox 3.5+
* Safari 4+
* Chrome
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

Additional contributions made to the project under the Dojo Foundation come from the following people:

`Richard Backhouse <http://github.com/rbackhouse>`_, `Nick Fitzgerald <http://github.com/fitzgen>`_

References
==========

The operational transformation algorithm used in the framework is based on various lines of research, such as: 

* \C. Sun, "Operational Transformation Frequently Asked Questions and Answers" 2010. [Online]. Available: http://cooffice.ntu.edu.sg/otfaq/
* \D. Sun and C. Sun: "Context-based Operational Transformation in Distributed Collaborative Editing Systems," in IEEE Transactions on Parallel and Distributed Systems, Vol. 20, No. 10, pp. 1454 – 1470, Oct. 2009.
* \D. Sun and C. Sun, "Operation context and context-based operational transformation," in CSCW '06: Proceedings of the 2006 20th anniversary conference on Computer supported cooperative work. New York, NY, USA: ACM Press, 2006, pp. 279-288. [Online]. Available: http://dx.doi.org/10.1145/1180875.1180918
* \D. Sun, S. Xia, C. Sun, and D. Chen, "Operational transformation for collaborative word processing," in CSCW '04: Proceedings of the 2004 ACM conference on Computer supported cooperative work. New York, NY, USA: ACM, 2004, pp. 437-446. [Online]. Available: http://dx.doi.org/10.1145/1031607.1031681
* \S. Xia, D. Sun, C. Sun, D. Chen, and H. Shen, "Leveraging single-user applications for multi-user collaboration: the coword approach," in CSCW '04: Proceedings of the 2004 ACM conference on Computer supported cooperative work.    New York, NY, USA: ACM, 2004, pp. 162-171. [Online]. Available: http://dx.doi.org/10.1145/1031607.1031635