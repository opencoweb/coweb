.. include:: /replace.rst
.. default-domain:: py
.. module:: org.coweb.bots
   :synopsis: Java package supporting service bots.

Service bots
------------

A Java :term:`service bot` implements the informal :class:`org.coweb.bots.Bot` interface to receive data from users in a coweb session. The bot uses a :class:`org.coweb.bots.Proxy` implementation to send data back to a coweb session. The bot configuration determines what transport it uses to communicate with a coweb server.

A Java bot must meet these criteria:

#. The bot must implement the :class:`org.coweb.bots.Bot` interface.
#. The bot must meet the criteria of its requested transport (e.g., reside in the coweb server class path for :class:`org.coweb.bots.transport.LocalTransport`).

Declaring bot metadata
~~~~~~~~~~~~~~~~~~~~~~

Bots declare their metadata and configuration in standard Java properties file.  The following are the known properties. Any property except those noted as required may be omitted.

name
   Human readable name of the service bot.
description
   Human readable description of the service bot.
author
   Human readable author of the service bot.
version
   Version number of the bot implementation.
service
   Required unique name of the service offered by the bot.
class
   Required name of the class implementing the :class:`org.coweb.bots.Bot` interface.
broker
   Name of the :class:`org.coweb.bots.transport.Transport` class the bot should use to communicate with the coweb server. Defaults to :class:`org.coweb.bots.transport.LocalTransport` if omitted. 

Implementing a bot
~~~~~~~~~~~~~~~~~~

.. class:: Bot

   Formal interface for a service bot with callbacks for session events.

   .. method:: init() -> void
   
      A bot proxy invokes this method upon the first message delivered to the bot (i.e., when it joins the session).

   .. method:: onRequest(Map<String, Object> params, String replyToken, String userName) -> void
   
      A bot proxy calls this method when a coweb application posts a private request to the bot.
      
      :param params: Arbitrary name/value pairs sent to the bot by a JavaScript application
      :param replyToken: Token to use when responding privately to this request
      :param username: Authenticated username of the requestor
   
   .. method:: onShutdown() -> void

      A bot proxy calls this method when the coweb server is about to shutdown the bot. The bot should cleanup its resources gracefully.
   
   .. method:: onSubscribe(String userName) -> void
   
      A bot proxy calls this method when a coweb application subscribes to messages published by this bot.
   
      :param username: Authenticated username of the subscriber

   .. method:: onSync(Map<String, Object> params, String userName) -> void
   
      A bot proxy calls this method when a coweb application publishes a cooperative event to the session.

      :param params: Cooperative event data observed in the session
      :param username: Authenticated username of the sender
   
   .. method:: onUnsubscribe(String userName) -> void
   
      A bot proxy calls this method when a coweb application unsubscribes from messages published by this bot or when a user leaves the session.

      :param username: Authenticated username of the unsubscriber
   
   .. method:: setProxy(Proxy proxy)
   
      A bot proxy calls this method to provide the bot with a reference to itself for sending broadcasts and responses.
      
      :param proxy: `org.coweb.bots.Proxy` instance

Using the bot proxy
~~~~~~~~~~~~~~~~~~~

.. class:: Proxy

   Formal interface for a service bot with methods for sending public and private messages back to a coweb server for delivery to a session.
   
   .. method:: reply(Bot bot, String replyToken, Map<String, Object> data) -> void
      
      A bot delegate calls this method to send a private response to an application that previously sent it a request.
      
      :param bot: :class:`Bot` instance sending the reply
      :param replyToken: Token from :meth:`Bot.onRequest`
      :param data: Data to send privately as a response to the original request
   
   .. method:: publish(Bot bot, Map<String, Object> data) -> void
      
      A bot calls this method to publish data to all subscribers of the bot service.

      :param bot: :class:`Bot` instance sending the reply
      :param data: Data to send privately as a response to the original request