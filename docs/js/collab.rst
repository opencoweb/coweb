.. include:: /replace.rst

Collaboration and services
--------------------------

A web application creates :class:`CollabInterface` instances to send and receive cooperative web events or communicate with session services. The application can create multiple instances to help segregate messages for its components if desire (e.g., widget to widget messaging).

The use of the collaboration API has the following requirements:

#. The web application must include the OpenAjax Hub v1.0.
#. The application must include Dojo 1.5 or higher.
#. The application must :func:`dojo.require` the `coweb` module.
#. The application must use the :doc:`session API <session>` to join, prepare, and update in a session before sending events using the collaboration API.

Initializing a collaboration instance
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. function:: coweb.initCollab([params])

   A web application or its runtime environment calls this method to get a reference to a :class:`CollabInterface` instance. The factory selects the best available implementation of the collaboration interface based on availability and browser capabilities.

   All parameters to this function are passed as name/value properties on a single `params` object. Only the `id` parameter is required.

   :param string id: Unique identifier to assign to this instance. Will only send messages to and receive messages from remote instances with the same ID.
   :param string wrapperImpl: Package and class name as a dotted string indicating the session implementation under `coweb.collab` to use. If undefined, the session factory determines the best implementation available.
   :returns: :class:`CollabInterface`

Using a collaboration instance
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. class:: CollabInterface()

   Encapsulates the collaboration APIs for web application use. A web application should use the :func:`coweb.initCollab` factory function instead of instantiating this object directly.
   
   .. note:: In typical Dojo fashion, all `subscribe*` methods in this interface can take a callback function as a parameter or, as a convenience, a context plus a callback method. If a context is specified, the provided callback is invoked with `this` bound to the context. Note that the doc below lists both parameters, but only explains the required callback.

.. function:: CollabInterface.subscribeConferenceReady(contextOrCallback, [boundCallback])
   
   A web application calls this method to subscribe to the event fired when the local :class:`SessionInterface` has finished preparing, joining, and updating in a session.
   
   :param function callback: Invoked when the application is ready to participate in the session. Receives an object having these properties:
   
      site (int)
         Site identifier assigned to this application instance by the coweb server. It is unique among all other sites in the session and valid for as long as the application remains in the session. The application can use the site ID to pair received cooperative events with the name of the user that generated them.
    
      username (string)
         Authenticated name of the local user

      roster (object)
         Roster of all users currently participating in the session, minus the local user. The object has integer site IDs as keys paired with string usernames.

   :returns: object (token for :func:`CollabInterface.unsubscribe`)
   
.. function:: CollabInterface.subscribeConferenceEnd(contextOrCallback, [boundCallback])
   
   A web application calls this method to subscribe to the event fired when the local application is leaving or has left a session. The callback executes only if the application received the ready callback (i.e., it was updated in the session).
   
   :param function callback: Invoked when the application is leaving or has left the session. Receives an object having these properties:
   
      connected (bool)
         True if the application is still in the session at the time the callback is invoked or false if not

   :returns: object (token for :func:`CollabInterface.unsubscribe`)

.. function:: CollabInterface.subscribeSiteJoin(contextOrCallback, [boundCallback])

   A web application calls this method to subscribe to the event fired when a remote application instance finishes updating in the same session as the local instance.

   :param function callback: Invoked when another application instance is ready to participate in the session. Receives an object having these properties:
   
      site (int)
         Site identifier assigned to joining application instance by the coweb server
      
      username (string)
         Authenticated name of the remote user

   :returns: object (token for :func:`CollabInterface.unsubscribe`)

.. function:: CollabInterface.subscribeSiteLeave(contextOrCallback, [boundCallback])

   A web application calls this method to subscribe to the event fired when a remote application instance leaves the session. The callback executes only if the leaving site previously notified that it joined.

   :param function callback: Invoked when another application instance stops participating in a session. Receives an object having these properties:
   
      site (int)
         Site identifier assigned to the leaving application instance by the coweb server

      username (string)
         Authenticated name of the remote user

   :returns: object (token for :func:`CollabInterface.unsubscribe`)

.. function:: CollabInterface.sendSync(name, value, [type='update', position=0])

   A web application calls this method to send a cooperative web event to all other application instances in a session.

   :param string name: Name identifying which application property changed
   :param object value: New property value. Must be JSON-encodable.
   :param string type: Type of event corresponding to the operations supported by the operation engine: `update`, `insert`, `delete`, or `null`
   :param int position: Position of the value change in a collection of values supporting insertion and deletion
   :returns: undefined

   .. note:: The coweb framework actively prevents the sending of coweb events from within a callback handling a coweb event. This limitation is by-design to mitigate event "storm" where one event triggers all other applications to send coweb events ad infinitum. If an application truly needs to send a coweb event immediately upon receiving one, it should do so asynchronously using :func:`setTimeout`.

.. function:: CollabInterface.subscribeSync(name, contextOrCallback, [boundCallback])

   A web application calls this method to subscribe to cooperative events sent by remote application instances in a session. The callback never fires for events sent by any local :class:`CollabInterface` instance. The callback always fires after received events are processed and potentially transformed by the local coweb operation engine. The changes made by the operation engine are transparent to the application.

   :param string name: Name identifying which application property to monitor for changes
   :param function callback: Invoked when another application instance stops participating in a session. Receives the following five, separate parameters:
   
      topic (string)
         Full topic name including the name of the application property which changed value. To obtain the property name alone, use :func:`CollabInterface.getSyncNameFromTopic`.
      value (object)
         New property value
      type (string)
         Type of event corresponding to the operations supported by the operation engine: `update`, `insert`, `delete`, or `null`.
      position (int)
         Position of the value change in a collection of values supporting insertion and deletion
      site (int)
         Site identifier assigned to application instance where the event originated

   :returns: object (token for :func:`CollabInterface.unsubscribe`)

.. function:: CollabInterface.getSyncNameFromTopic(topic)

   A web application calls this method to obtain the name of the application property effected by a cooperative web event given the full topic string received by a :func:`CollabInterface.subscribeSync` callback.

   :param string topic: A full string topic to parse 
   :returns: String name provided to the remote invocation of :func:`CollabInterface.sendSync` that triggered the callback. If the topic parameter is not in the correct form, the return value is an unknown string.

.. function:: CollabInterface.subscribeStateRequest(contextOrCallback, [boundCallback])

   A web application calls this method to subscribe to the requests for full application state by joining application instances. If the application instance does not service this request in timely manner, it risks being removed from the session by the coweb server.

   :param function callback: Invoked when the coweb server contacts this application instance for a copy of the shared session state in order to update a joining instance. Receives an opaque token that must be included in the requisite call to :func:`CollabInterface.sendStateResponse`.
   :returns: object (token for :func:`CollabInterface.unsubscribe`)

.. function:: CollabInterface.sendStateResponse(state, token)

   A web application calls this method to send a response to a full state request.

   :param object state: Arbitrary name/value pairs representing a portion or all of the application state. Must be JSON-encodable.
   :param object token: The opaque token received in a prior :func:`CollabInterface.subscribeStateRequest` callback to which this invocation is a response
   :returns: undefined

.. function:: CollabInterface.subscribeStateResponse(contextOrCallback, [boundCallback])

   A web application calls this method to subscribe to full state responses while attempting to update in a session.

   :param function callback: Invoked when this application instance receives a copy of the shared session state from the coweb server so that the local instance can update itself before participating in the session. Receives an object with arbitrary property names and values corresponding to those sent by a remote call to :func:`CollabInterface.sendStateResponse`.
   :returns: object (token for :func:`CollabInterface.unsubscribe`)

.. function:: CollabInterface.subscribeService(service, contextOrCallback, [boundCallback])

   A web application calls this method to subscribe to data published by a service bot.

   :param string service: Name of the service
   :param function callback: Invoked when this application instance receives data published by the server bot. The function receives the following two parameters:
   
      value (object)
         Arbitrary, JSON-decoded data published by the service

      error (bool)
         True if the subscription to the service failed and the value is an error tag describing the issue. False if the value is actual data from the service.

   :returns: object (token for :func:`CollabInterface.unsubscribe`)

.. function:: CollabInterface.postService(service, params, contextOrCallback, [boundCallback])

   A web application calls this method to send a private request to a service bot and receive a single, private response.
   
   :param string service: Name of the service
   :param object params: Arbitrary name/value pairs to send to the service bot. Must be JSON-encodable.
   :param function callback: Invoked when this application instance receives data published by the server bot. The function receives the following two parameters:

      value (object)
         Arbitrary, JSON-decoded data from the service

      error (bool)
         True if the request to the service failed and the value is an error tag describing the issue. False if the value is actual data from the service.

   :returns: object (token for :func:`CollabInterface.unsubscribe`)

.. function:: CollabInterface.unsubscribe(token)

   A web application calls this method to unsubscribe any callback registered with any subscribe method on this collaboration instance.

   :param object token: The return value from a previous call to a subscribe method on this instance
   :returns: undefined

.. function:: CollabInterface.unsubscribeAll()

   A web application calls this method to unsubscribe all callbacks registered with any subscribe method on this collaboration instance. The method has no parameters and returns no value.

Use cases
~~~~~~~~~

The following code snippets demonstrate some common uses of the collaboration API. All of the use cases assume the application has imported the required libraries, created a :class:`CollabInterface` instance, stored it in a  variable named `collab`, and initialized it properly.

Observing joining and leaving users
###################################

Assume an application wants to display peripheral popups as users join and leave a session. The application registers two functions, :func:`onParticipantJoin` and :func:`onParticipantLeave`, to receive callbacks when participants come and go.

.. sourcecode:: javascript

   function onParticipantJoin(site) {
      showPopup('A new participant joined!');
   }
   var t1 = collab.subscribeConferenceJoin(onParticipantJoin);
  
   function onParticipantLeave(site) {
      showPopup('A participant left!');
   }
   var t2 = collab.subscribeConferenceLeave(onParticipantLeave);

Later, the user decides to disable these notifications. The application unsubscribes its callbacks to prevent further popups.

.. sourcecode:: javascript

   collab.unsubscribe(t1);
   collab.unsubscribe(t2);

Sending potentially conflicting events
######################################

Say an application wishes to synchronize the display of a grocery list of items with other application instances in a conference. The application allows users to insert new items, delete existing items, and change the labels of items in the list. The application maintains all copies of the list in the same sorted order.

When the user changes the name of an item, the application notifies remote instances about the update. It uses the event name `grocery` to distinguish a change to the list from all other application events.

.. sourcecode:: javascript

   collab.sendSync('grocery', new_item_label, 'update', item_position);
  
When the user insert a new item, the application notifies remote instances in a similar manner.

.. sourcecode:: javascript

   collab.sendSync('grocery', new_item_label, 'insert', new_item_position);
  
Notifications of user deletes are essentially the same as well.

.. sourcecode:: javascript

   collab.sendSync('grocery', null, 'delete', item_position);

The application listens for remote changes to the list by registering a function, :func:`onGroceryListChange`. The function takes proper action to integrate remote changes into the local list.

.. sourcecode:: javascript

   function onGroceryListChange(topic, value, type, pos, site) {
      if(type == 'update') {
         // rename an item at position 'pos' in the list to name 'value'
         renameListItem(value, pos);
      } else if(type == 'insert') {
         // insert a new item with name 'value' at position 'pos'
         addListItem(value, pos);
      } else if(type == 'delete') {
         // remove an existing item at position 'pos'
         removeListItem(pos);
      }
   }
   collab.subscribeSync('grocery', onGroceryListChange);

Keep in mind that the coweb operation engine automatically transforms the values and positions passed to the :func:`onGroceryListChange` function to account for simultaneous changes across remote instances. All the callback need do is update, insert, or remove list items at the reported location to keep the list in sync with its remote copies.

Sending events that cannot conflict
###################################

Pretend an application wants to display the availability of users in a conference: available, busy, idle, etc. The application lets every user pick a status label from a fixed list independent of all other users. Because every user has his or her own status, status changes made by one user can never conflict with changes made simultaneously by another user.

When the local user selects a status, the application informs all other instances of the change. It uses the name `user.status` to distinguish a change to user availability from all other events sent by the application.

.. sourcecode:: javascript

   collab.sendSync('user.status', new_status, null);

The application listens for remote user status changes by registering a function, :func:`onUserStatusChange`. The function takes proper action to display the new status for the user indicated by the given site identifier.

.. sourcecode:: javascript

   function onUserStatusChange(topic, value, type, pos, site) {
      if(type == null) {
         // show the new status 'value' for the user at site 'site'
         showStatus(value, site);
      }
   }
   collab.subscribeSync('user.status', onUserStatusChange);

Initializing application state
##############################

Imagine an application wants to initialize itself to match its remote counterparts when it joins a session late. The application registers a function, :func:`onInitialState`, to receive a copy of the current state upon joining the session.

.. sourcecode:: javascript

   function onInitialState(state) {
      // initialize the local instance with the state somehow
      initializeApp(state);
   }
  var t1 = collab.subscribeStateResponse(onInitialState);
  
The application registers another function, :func:`onProvideState`, to assist other instances when they join the session.

.. sourcecode:: javascript

   function onProvideState(token) {
      var state = getCurrentAppState();
      collab.sendStateResponse(state, token);
   }
   var t2 = collab.subscribeStateRequest(onProvideState);

The application registers both functions as soon as it starts. The coweb server is careful not to request state from an uninitialized application, so there is no harm in subscribing to both responses and requests upfront.

Subscribing to a service
########################

Assume an application wants to subscribe to a service bot named `temperature` that pushes sensor data to a session as they become available.

.. sourcecode:: javascript

   function onTemperatureData(sensors, isError) {
      if(isError) {
         // couldn't contact service, handle it
         return;
      }
      for(var key in sensors) {
         // plot sensor values as they arrive
         plotValue(key, sensors[key]);
      }
   }
   var t1 = collab.subscribeService('temperature', onTemperatureData);

Later, the local user decides to disable notifications from the service. The application unsubscribes its callbacks to prevent further plotting.

.. sourcecode:: javascript

   collab.unsubscribe(t1);

Posting data to a service
#########################

Say the same application that subscribed to sensor values now wants to tell the service which sensors to monitor. The user selects sensors `a3` and `b0` in the application user interface. The application sends these values to the service and registers an anonymous function to receive a response to the request.

.. sourcecode:: javascript

   var data = {sensors : ['a3', 'b0']};
   collab.subscribeService('temperature', data, function(result, isError) {
      if(isError) {
         // couldn't contact service, handle it
      } else {
         // handle result to make sure sensors were valid, etc.
      }
   });
  
The :class:`CollabInterface` automatically unregisters the response callback after the first response from the service. If all went well, the :func:`onTemperatureData` subscribed to the service should receive info about the requested sensors the next time the bot publishes information.

.. seealso::

   :doc:`/intro/openg`
      Documentation of how the coweb operation engine uses the metadata included in calls to :func:`CollabInterface.sendSync` to resolve conflicting, simultaneous changes.

   :doc:`/tutorial/shopping`
      Tutorial detailing the use of the collaboration API to create a cooperative shopping list.