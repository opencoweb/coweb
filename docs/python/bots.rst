.. include:: /replace.rst
.. default-domain:: py
.. module:: coweb.bot
   :synopsis: Python package supporting service bots.

Service bots
------------

A Python :term:`service bot` implements the informal :class:`coweb.bot.Delegate` interface to receive data from users in a coweb session. The bot uses a :class:`coweb.bot.wrapper.BotWrapperBase` implementation as a proxy for sending data back to a coweb session. The coweb server configuration determines how it loads, launches, and communicates with a bot instance.

A Python bot must meet these criteria:

#. The bot script must reside in a search path determined by the coweb server configuration.
#. The script must import :mod:`coweb.bot` from the :mod:`coweb` Python package.
#. The script must invoke :func:`coweb.bot.run` upon import or execution.

Implementing a bot delegate
~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. class:: Delegate

   A service bot must implement the constructor with the signature defined in this interface. A service bot may implement one or more of the other methods defined in this informal interface to receive data from applications in a conference.

   .. note:: 

      The :class:`Delegate` class itself is not actually declared in :mod:`pbs.bot`. It is an informal interface.

   .. method:: __init__(self, botWrapper, serviceName, appData)
   
      A bot wrapper invokes this constructor after the bot joins the session.
   
      :param BotWrapperBase botWrapper: Wrapper instance
      :param str serviceName: Name of the service provided by this bot
      :param dict appData: Arbitrary name/value pairs provided by the coweb server for use by the bot
      :rtype: None
   
   .. method:: on_request(self, data, replyToken, username)
   
      A bot wrapper calls this method when a coweb application posts a private request to the bot.
   
      :param dict data: Arbitrary name/value pairs sent to the bot by a JavaScript application
      :param str replyToken: Token to use when responding privately to this request
      :param str username: Coweb server username of the user who sent the request
      :rtype: None
   
   .. method:: on_shutdown(self)
   
      A bot wrapper calls this method when the coweb server is about to shutdown the bot. The bot should cleanup its resources gracefully.
   
      :rtype: None

   .. method:: on_subscribe(self, username)
   
      A bot wrapper calls this method when a coweb application subscribes to messages published by this bot.
   
      :param str username: Coweb server username of the user who sent the request
      :rtype: None

   .. method:: on_sync(self, data, username)
   
      A bot wrapper calls this method when a coweb application publishes a cooperative event to the session. Whether the coweb server delivers these events to the bot is determined by the return value from the :meth:`coweb.access.AccessBase.on_service_acls` method.

      :param dict data: Cooperative event data observed in the session
      :param str username: Coweb server username of the user who sent the request
      :rtype: None

   .. method:: on_unsubscribe(self, username)
   
      A bot wrapper calls this method when a coweb application unsubscribes from messages published by this bot or when a user leaves the session.

      :param str username: Name of the coweb server authenticated user who unsubscribed from the service
      :rtype: None
   
Using the bot wrapper
~~~~~~~~~~~~~~~~~~~~~

.. module:: coweb.bot.wrapper
   :synopsis: Python package defining the bot wrapper interface and its default implementations.

.. class:: BotWrapperBase

   The :func:`coweb.bot.run` function creates an instance of an implementation of this class based on the transport bot-server transport configured for the coweb server. The instance acts as a proxy between the :class:`pbs.bot.Delegate` and the coweb server. 
   
   Support for a new transport between bots and the coweb server can be added by creating a new subclass of :class:`BaseBotWrapper` and a corresponding :class:`coweb.service.manager.ServiceManagerBase` subclass.

   .. method:: add_callback(self, callback, *args, **kwargs)
   
      A bot delegate calls this method to schedule an asynchronous callback.
   
      :param callable callback: Callback to invoke asynchronously with `args` and `kwargs`
      :param args: Arbitrary callback args
      :param kwargs: Arbitrary callback keyword args
      :rtype: None

   .. method:: add_timer(self, delay, callback, *args, **kwargs)
   
      A bot delegate calls this method to schedule an asynchronous one-shot timer callback.

      :param float delay: Delay in seconds before invoke the callback
      :param callable callback:  Callback to invoke after `delay` with `args` and `kwargs`
      :param args: Arbitrary callback args
      :param kwargs: Arbitrary callback keyword args
      :rtype: opaque

   .. method:: publish(self, data)

      A bot delegate calls this method to publish data to all subscribers of the bot service.
   
      :param dict data: Data to publish to all subscribers of this service
      :rtype: None

   .. method:: reply(self, replyToken, data)
   
      A bot delegate calls this method to send a private response to an application that previously sent it a request.
      
      :param str replyToken: Token from :meth:`on_request`
      :param dict data: Data to send privately as a response to the original request
      :rtype: None

   .. method:: remove_timer(self, timer)
   
      A bot delegate calls this method to cancel a one-shot timer that has not fired yet.
   
      :param object timer: Timer object from :meth:`add_timer`
      :rtype: None

Usage
~~~~~

The following code is a simple template for a coweb Python bot: 

.. sourcecode:: python

   import pbs.bot
   
   class NoOpBot:
      '''Do nothing bot.'''
      def __init__(self, botWrapper, *args):
         self.botWrapper = botWrapper

      # Implement some delegate methods to respond to events

   pbs.bot.run(NoOpBot)