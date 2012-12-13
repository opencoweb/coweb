.. reviewed 0.4
.. include:: /replace.rst
.. default-domain:: py

Coweb Moderator
---------------

The moderator API has been added to the Python server. The API and functionality
is identical to that of the Java moderator, so please look at the documentation
for the :doc:`../java/moderator`.

The `SessionModerator javadocs`_ are also useful, since they document the
moderator callbacks. Even though the documentation is for Java, the API is
identical for Python. Implementors of a Python moderator shold subclass
:class:`coweb.SessionModerator` or :class:`coweb.DefaultSessionModerator`.

