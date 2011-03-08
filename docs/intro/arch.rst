.. include:: /replace.rst

Framework architecture
----------------------

The |coweb api| spans components that operate client-side within a standard web browser and those that execute on one or more servers. There are four conceptual layers of note:

Application
   The components of the browser-based application using the coweb framework
Client
   The browser-based components enabling session joining, cooperative eventing, and operational transformation
Server
   The server-side components that control coweb session access and lifecycle
Service
   The server-side components that enable external, programmatic participants in sessions (i.e., bots) 

The coweb framework currently has a JavaScript client layer implemented as a set of components in Asynchronous Module Definition (AMD) format. The framework has both Java and Python server layer implementations with the former relying on CometD's Java implementation and the latter built on Facebook's `Tornado`_ server. Bayeux serves as the wire format for communication between client and server  Both server implementations support services that run within the server process and offer extension points for external services to participate in sessions.

.. figure:: /images/arch.png
   :alt: Diagram of components and connections in the coweb framework at runtime.
   
   Diagram of components and connections in the coweb framework at runtime. Purple represents the application layer, orange the client layer, blue the server layer, and green the service layer.