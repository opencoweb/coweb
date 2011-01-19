.. include:: /replace.rst

Protocols
---------

These sections describe the various wire protocols used in the |coweb api|. The cooperative events protocol dictates communication between JavaScript applications and coweb servers. It must be supported by any third-party framework that seeks to be compatible with the |coweb api|. 

The service protocols document the message formats used by the transports supported in the current framework implementation (i.e., Bayeux). Service protocols using other transports are possible and encouraged. However, any third-party implementations of the existing bot transports should adhere to the documented protocols. For example, a Perl bot wrapper supporting Bayeux should follow the Bayeux protocol detailed here instead of inventing a new one.

.. toctree::
   :titlesonly:
   :maxdepth: 2
   
   coweb_bayeux
   bot_bayeux