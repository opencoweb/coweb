.. reviewed 0.4
.. include:: /replace.rst

Important JavaScript concepts
-----------------------------

There are two concepts central to the implementation of the JavaScript APIs of the |coweb api|: modules and promises. Both of these concepts come from proposed `CommonJS`_ specifications. The coweb framework leverages them to promote cross-toolkit compatibility.

Modules
~~~~~~~

Per its spec, the `Asynchronous Module Definition`_ specifies a mechanism for defining JavaScript modules such that the module and its dependencies can be asynchronously loaded. The JavaScript portions of the |coweb api| are all implemented as AMD compliant modules. A cooperative web application can use any AMD compliant loader to import the framework. For example, the next section about :doc:`config` gives an application template using `RequireJS`_ to load the |coweb api|.

The AMD format also permits minified, aggregated builds. Stable releases of the |coweb api| include builds produced by `RequireJS`_ for performance rather than the exploded, uncompressed source modules.

Promises
~~~~~~~~

A `promise`_ represents the eventual value returned from the single completion of an operation. Once a promise is fulfilled or failed, the value of the promise is never changed so that all listeners can equally observe its final value (i.e., one listener cannot affect another listener via the promise).

The |coweb api| uses promises wherever an action is potentially asynchronous, particularly in the :class:`SessionInterface`. A cooperative web application can register listeners on a returned promise to receive notification when such an action completes successfully or fails.

.. class:: Promise

   A minimal promise implementation based on the `Promises/A CommonJS proposal`_ but supporting an optional `context` argument to :func:`then` in place of the optional `progressHandler` defined in the spec.

.. function:: Promise.then(callback, errback [, context])

   A cooperative web application calls this method to register a function to invoke on promise resolution and/or a function to invoke on promise failure.
   
   :param function callback: Function to invoke upon successful completion of the action associated with the promise. Receives the value passed to :func:`resolve`.
   :param function errback: Function to invoke upon unsuccessful completion of the action associated with the promise. Receives the error passed to :func:`fail`.
   :param function context: Optional context in which to invoke callback or errback.
   :returns: A new :class:`Promise` instance associated with the action of successfully completing or failing to complete the registered callback and/or errback. Useful for chaining actions.

.. function:: Promise.resolve(value)

   The framework resolves a promise upon successful completion of an action. Registered callback listeners receive a documented value as their sole parameter.
   
   :param object value: Arbitrary value to pass to promise callbacks

.. function:: Promise.fail(error)

   The framework fails a promise upon unsucessful completion of an action. Registered errback listeners receive an :class:`Error` object as their sole parameter.
   
   :param object error: :class:`Error` object to pass to promise errbacks
