.. reviewed 0.4
.. include:: /replace.rst
.. default-domain:: py
.. module:: org.coweb

Moderator API
-------------

This documention documents the features and how to use the Moderator API.
Application developers can use the Moderator API to track an OpenCoweb session's
collaborative operations. A typical use case is to track the application state
on the server side, which can then be used to store to permenant state (eg.
storing to hard disk).

A moderator instance exists exists for each collaborative
session (i.e. each *cowebkey*) and will persist for the lifetime of the server.
This is especially useful for keeping a session's application state alive, even
when all browser clients leave a session.

The Moderator API: SessionModerator
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

See also the `SessionModerator javadocs`_.

.. class:: SessionModerator

    This interface specifies callbacks for various coweb events, such as a user
    joining a session or a remote operation having been performed.

    .. method:: canClientJoinSession(ServerSession client) -> boolean

        The coweb server calls this method to determine whether or not a browser
        client can join a session. Implementors must return whether or not the
        browser client can join the session.

        :param client: Joining client's connection.
        :return: Whether or not the browser client can join.

    .. method:: onSync(Map<String, Object> data) -> boolean

        The coweb server calls this anytime the server's local operation engine
        determines there is a sync event to apply to the moderator's local copy
        of the application data structure(s). Like coweb browser applications,
        the implementors must honor and apply all sync events to local data
        structure(s).

        This method should return whether or not the sync event should be
        forwarded to bots.

        The parameter ``data`` has the five keys specified below.

        * ``channel`` - A string specifying the bayeux channel the message was
          sent on. This is useful to distinguish browser collab objects and
          sendSync topic names that operations are sent on.
        * ``type`` - String specifying the type of sync (eg. *insert*, *delete*)
        * ``site`` - Integer site id where event originated from.
        * ``value`` - JSON object value representing the new value. See
          `org.eclipse.jetty.util.ajax.JSON`_ for how to read this object.
        * ``position`` - Integer position specifying where in the
          one-dimensional array the operation should be applied.

        :param data: Operation to be applied.
        :return: Whether or not the sync should be forwarded to bots.

    .. method:: getLateJoinState(void) -> Map<String, Object>

        :return:

    .. method:: onClientLeaveSession(ServerSession client) -> void

        :param client:

    .. method:: canClientSubscribeService(ServerSession client) -> boolean

        :param client:

    .. method:: canClientMakeServiceRequest(ServerSession client, Message botMessage) -> boolean

        :param client:
        :param botMessage:

    .. method:: onServiceResponse(Message botResponse) -> void

        :param botMessage:

    .. method:: onSessionEnd(void) -> void

