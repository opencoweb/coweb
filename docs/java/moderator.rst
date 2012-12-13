.. reviewed 0.4
.. include:: /replace.rst
.. default-domain:: py
.. module:: org.coweb

Java Moderator
--------------

This documention documents the features of and how to use the Moderator API.
Application developers can use the Moderator API to track an OpenCoweb session's
collaborative operations. A typical use case is to track the application state
on the server side, which can then be used to store to permenant state (eg.
storing to hard disk).

A moderator instance exists exists for each collaborative
session (i.e. each *cowebkey*) and will persist for the lifetime of the server.
This is especially useful for keeping a session's application state alive, even
when all browser clients leave a session.

Even though the moderator lives on the server side, it acts like any other
client. All sync events it receives are transformed using an operating engine.
The moderator itself can send sync events to other clients, and can communicate
with service bots in the same way browser clients can.

Public API
~~~~~~~~~~

Application programmers should implement subclasses of SessionModerator, and the
following documentation should be helpful in writing a useful implementation.
See the `SessionModerator javadocs`_ for a complete description of the
moderator API.

Moderator Operation
~~~~~~~~~~~~~~~~~~~

When a browser client joins a new coweb session (keyed by the unique *cowbkey*),
the server creates a new moderator instance. The moderator persists for the
lifetime of the server. As long as there are connected browser clients, we
consider the coweb session *active*. If all browser clients leave the session,
the session is considered *inactive*.

Anytime a session becomes active, te server invokes the moderator's
``SessionModerator::onSessionReady()`` callback; when a session goes inactive,
the server invokes ``SessionModerator::onSessionEnd()``.

Interacting with the session
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Moderators can send sync events and bot messages using the
`CollabInterface`_ interface. Analogous to the JavaScript
:class:`CollabInterface`, moderators create CollabInterface objects for each
collab object keyed on the collab object ID.

CollabInterface objects can only be created when a session is active, and once a
session becomes inactive, all CollabInterfaces become invalid. These
CollabInterface objects can no longer be used, even if the session becomes
active again. When the session becomes active again, the moderator must create
new CollabInterface objects.

