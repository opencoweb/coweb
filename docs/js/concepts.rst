.. reviewed 0.4
.. include:: /replace.rst

Important JavaScript concepts
-----------------------------

There are two concepts central to the implementation of the JavaScript APIs of the |coweb api|: modules and promises. Both of these concepts come from proposed `CommonJS`_ specifications. The coweb framework leverages them to promote cross-toolkit compatibility.

Modules
~~~~~~~

Per its spec, the `Asynchronous Module Definition`_ specifies a mechanism for defining JavaScript modules such that the module and its dependencies can be asynchronously loaded. The JavaScript portions of the |coweb api| are all implemented as AMD compliant modules. A cooperative web application can use any AMD compliant loader to import the framework. For example, the section about :doc:`config` includes an application template that uses `RequireJS`_ to load the |coweb api|.

The AMD format also permits minified, aggregated builds. Stable releases of the |coweb api| include builds produced by `RequireJS`_ for performance rather than the exploded, uncompressed source modules.

Promises
~~~~~~~~

A `promise`_ represents the eventual value returned from the single completion of an operation. Once a promise is fulfilled or failed, the value of the promise is never changed so that its consumers can equally observe its final value (i.e., one consumer cannot affect the value observed by another consumer).

The |coweb api| uses promises wherever an action is potentially asynchronous, particularly in the :class:`SessionInterface`. A cooperative web application can register listeners on these promises to receive notification when such an action completes successfully or fails. For example, the :ref:`SessionInterface use cases <session-use-cases>` demonstrate the use of :func:`Promise.then` to receive notification of success or failure preparing, joining, or updating in a cooperative web session.

An application never needs to create :class:`Promise` instances to use the |coweb api|, only register listeners on promises returned by the framework. Of course, an application may reuse the :class:`Promise` class for its own purposes if desired.

.. class:: Promise

   A minimal promise implementation based on the `Promises/A CommonJS proposal`_ but supporting an optional `context` argument to :func:`then` in place of the optional `progressHandler` defined in the spec.

.. function:: Promise.then(callback, errback [, context])

   A cooperative web application calls this method to register a function to invoke on promise resolution and/or a function to invoke on promise failure.
   
   :param function callback: Function to invoke upon successful completion of the action associated with the promise. Receives the value passed to :func:`resolve`.
   :param function errback: Function to invoke upon unsuccessful completion of the action associated with the promise. Receives the error passed to :func:`fail`.
   :param function context: Optional context in which to invoke callback or errback (i.e., binding for `this`)
   :returns: A new :class:`Promise` instance associated with the action of successfully completing or failing to complete the registered callback and/or errback. Useful for chaining actions.

.. function:: Promise.resolve(value)

   The framework resolves a promise upon successful completion of an action. Registered callback listeners receive a documented value as their sole parameter.
   
   :param object value: Arbitrary value to pass to promise callbacks

.. function:: Promise.fail(error)

   The framework fails a promise upon unsucessful completion of an action. Registered errback listeners receive an :class:`Error` object as their sole parameter.
   
   :param object error: :class:`Error` object to pass to promise errbacks
