.. include:: /replace.rst
.. default-domain:: py
.. module:: coweb.bot
   :synopsis: Python module supporting service bots.

Service bots
------------

A Python :term:`service bot` implements the informal :class:`coweb.bot.Delegate` interface to receive data from users in a coweb session. The bot uses a `coweb.bot.wrapper.BotWrapperBase` implementation as a proxy for sending data back to a coweb session. The coweb server configuration determines how it loads, launches, and communicates with a bot instance.

A Python bot must meet these criteria:

#. The bot script must reside in a search path determined by the coweb server configuration.
#. The script must import :mod:`coweb.bot` from the :mod:`coweb` Python package.
#. The script must invoke :func:`coweb.bot.run` upon import or execution.

Implementing a bot delegate
~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. class:: Delegate
   
   .. method:: __init__(self, botWrapper, serviceName, appData)
   
      :param BotWrapperBase botWrapper: Wrapper instance
      :param str serviceName: Name of the service provided by this bot
      :param dict appData: Arbitrary name/value pairs provided by the coweb server for use by the bot
      :rtype: None
   
   .. method:: on_request(self, data, replyToken, username)
   
      :param dict data: Arbitrary name/value pairs sent to the bot by a JavaScript application
      :param str replyToken: Token to use when responding privately to this request
      :param str username: Name of the coweb server authenticated user who sent the request
      :rtype: None
   
   .. method:: on_shutdown(self)
   
      :rtype: None

   .. method:: on_subscribe(self, username)
   
      :param str username: Name of the coweb server authenticated user who subscribed to the service
      :rtype: None

   .. method:: on_sync(self, data, username)

      :param dict data: JavaScript coweb event data observed in the session
      :param str username: Name of the coweb server authenticated user who sent the event
      :rtype: None

   .. method:: on_unsubscribe(self, username)

      :param str username: Name of the coweb server authenticated user who unsubscribed from the service
      :rtype: None
   
Using the bot wrapper
~~~~~~~~~~~~~~~~~~~~~

.. module:: coweb.bot.wrapper
   :synopsis: Python module defining the bot wrapper interface.

.. class:: BaseBotWrapper

   .. method:: add_callback(self, callback, *args, **kwargs)
   
      :param callable callback: Callback to invoke asynchronously with `args` and `kwargs`
      :param args: Arbitrary callback args
      :param kwargs: Arbitrary callback keyword args
      :rtype: None

   .. method:: add_timer(self, delay, callback, *args, **kwargs)

      :param float delay: Delay in seconds before invoke the callback
      :param callable callback:  Callback to invoke after `delay` with `args` and `kwargs`
      :param args: Arbitrary callback args
      :param kwargs: Arbitrary callback keyword args
      :rtype: opaque

   .. method:: publish(self, data)
   
      :param dict data: Data to publish to all subscribers of this service
      :rtype: None

   .. method:: reply(self, replyToken, data)
      
      :param str replyToken: Token from :meth:`on_request`
      :param dict data: Data to send privately as a response to the original request
      :rtype: None

   .. method:: remove_timer(self, timer)
   
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