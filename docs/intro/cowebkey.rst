.. reviewed 0.8.4
.. include:: /replace.rst

Connecting to a session
-----------------------

Cooperative web applications in OpenCoweb organize clients in *sessions*.
Clients commmunicate with other clients in the same session by sending and
receiving sync events. A session is keyed by a unique *cowebkey*, discussed
below. Clients join and leave sessions by directing their browser to a URL with
an encoded cowebkey.

Cowebkey semantics
~~~~~~~~~~~~~~~~~~

A cowebkey is a string of letters, numbers, dashes, and underscores that
uniquely identifies an OCW session. The cowebkey can be encoded in a URL in
three different ways. In the following example, suppose we are connecting to the
CoList demo application located at ``http://domain.com/colist``, and suppose
our OCW session is keyed by ``cowekbey=chris-grocery-list``. Clients can connect
to this session by navigating their browser to three different URLs.

* http://domain.com/colist/#/cowebkey=chris-grocery-list
* http://domain.com/colist/#/cowebkey/chris-grocery-list
* http://domain.com/colist?cowebkey=chris-grocery-list

The reader should note the first two URLs use the *fragment idenfier* to specify
the cowebkey, and the third URL uses a *query string*.

Fragment identifier
~~~~~~~~~~~~~~~~~~~

See the wikipedia document on `fragment identifier`_ for general information
about how browsers handle URLs.

