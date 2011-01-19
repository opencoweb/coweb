.. include:: /replace.rst

JavaScript APIs
---------------

The JavaScript API allows a web application to control its participation in a session, and the transmission of cooperative events and service data. These features are split across two components, the session API and the collaboration API respectively. The JavaScript API also includes some extra components which can ease the development of coweb applications, but are strictly optional.

.. note:: 
   At present, the JavaScript API is implemented as a set of Dojo modules. This may change as the `CommonJS Asychronous Module Definition`__ is adopted to enable cross-toolkit compatibility.
   
   __ http://wiki.commonjs.org/wiki/Modules/AsynchronousDefinition

.. toctree::
   :titlesonly:
   
   session
   collab
   extra