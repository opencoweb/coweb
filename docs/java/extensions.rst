.. reviewed 0.4
.. include:: /replace.rst

Extension points
----------------

The optional admin servlet parameters in the coweb application deployment
descriptor can name custom classes deriving from base classes in the
`org.coweb` package. The optional broker parameter in a service bot
configuration file can also name a custom class deriving from a base class in
the same package. New implementations of these bases can define new methods of
communicating with bots and controlling the type of updater
selected for late joiners. Together, they represent points of extension on the
coweb server.

The creation and use of new subclasses at these extension points requires:

#. The installation of the coweb Maven modules.
#. The configuration of the coweb admin servlet to use alternative security
   policy and/or session delegate classes.
#. The configuration of coweb bots to use an alternative transport class.
#. The configuration of an updater type matcher implementation used to select
   the type of updater for late joiners.

See the sections about :doc:`deploy` and :doc:`bots` for assistance configuring
deployment descriptors and bots.

Communicating with service bots
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

See the `org.coweb.bots.transport` Java package for interfaces and
implementations. The `org.coweb.bots.transport.Transport`_ Javadoc documents
the Transport extension class.

Controlling the type of Updater assigned to late joiners
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

See the `org.coweb.UpdaterTypeMatcher`_ Javadoc for documentation on using
the custom updater extension.

