.. reviewed 0.4
.. include:: /replace.rst

Cooperation, concurrency, conflict, and convergence
---------------------------------------------------

The heart of the |coweb api| is its support for cooperative interactions: allowing any number of users to make and see application changes in real-time. For example, one particular :term:`cooperative web application` might support the cooperative editing of a shopping list. While one user is adding items to the list, another user might fill in quantities to purchase, while yet another might enter the cost of each item. Meanwhile, any number of other users might be watching the list develop or making corrections where needed. Every user sees the edits of the other users in real-time and can make his or her own changes at any time. Coweb applications accomplish this level of interactivity by sending and listening for :term:`cooperative events`.

Imagine that two users, Alice and Bob, are using such a coweb shopping list to plan a grocery trip. So far, they have two items, `bananas` and `kiwis`, on their shared list. Looking at the list, Alice decides she wants to buy apples this week instead of bananas. She edits her list, changing `bananas` to `apples`, and then presses :kbd:`Enter`. The application sends her change to Bill who sees the `bananas` item replaced with `apples`. Bill thinks he'd rather have oranges this week, so he changes the item appropriately. The application sends Bill's edit to Alice who sees `apples` replaced with `oranges` in her list. Unsatisfied, Alice works out a compromise with Bill, and adds a new `apples` item to the list, leaving Bill's `oranges` in place. Both Bill and Alice now see a list containing `apples`, `oranges`, and `kiwis`. 

.. figure:: /images/simple-openg.png
   :alt: Diagram of Alice and Bob's edits.
   :target: ../_images/simple-openg.png
   
   Diagram of Alice's and Bob's shopping list edits over time. Time flows from left to right. Changes originating from Alice appear in blue. Changes from Bob appear in green. In this simple workflow, Alice and Bob are taking turns changing the shopping list.

Conflicts and divergence
~~~~~~~~~~~~~~~~~~~~~~~~

A problem arises with such flexible interaction: user edits can conflict. Alice might change the `bananas` shopping list item to read `apples` while Bob changes it to `oranges` **at the same time**. Alice sees her local change instantly while Bob sees his immediately as well, but the cooperative events for Alice and Bob's edits take time to transmit. This delay can change the ordering of user edits and result in consistency problems if not corrected. How to guarantee *convergence*, eventual consistency among remote application state, so that Alice and Bob end up seeing and working on the same list is a key challenge for cooperative web applications.

.. figure:: /images/conflict-openg.png
   :alt: Diagram of a conflicting edit from Alice and Bob.
   :target: ../_images/conflict-openg.png
   
   Diagram of a conflicting edit from Alice and Bob. Time flows from left to right. Changes originating from Alice appear in blue. Changes from Bob appear in green. The pink box depicts where an editing conflict must be resolved to guarantee consistency.

Consider the simple but poor design of updating the shopping list to show the last edit received. With this choice, Alice and Bob will end up looking at two different lists. Alice will see her change to `apples` followed by the change to `oranges` when Bob's event arrives. Bob, on the other hand, will see his change to `oranges` and then a change to `apples` when Alice's edit arrives. Bob and Alice might start discussing their shopping lists without even realizing they are different.

.. figure:: /images/lastedit-openg.png
   :alt: Diagram of a conflicting edit from Alice and Bob.
   :target: ../_images/lastedit-openg.png
   
   Diagram of poor, last-edit conflict resolution. After all outstanding events are processed, Alice sees `oranges` while Bill sees `apples`.

The problem becomes even more complex with additional users and greater lag. Imagine Cathy joins Bob and Alice. Bob's network is slow, and both Alice and Cathy manage to insert and delete ten new items before receiving Bob's one edit. Meanwhile, Bob continues making edits locally while Alice's and Cathy's edits are still in transit to him. To guarantee consistency, the application needs to account for the late arrival of remote edits performed on earlier versions of the shopping list. 

Consistency is not a problem that can be ignored. In applications with more sensitive information, application consistency across users is critical to successful cooperation. Surgeons and nurses making pre-op checklists need to be discussing the same plan!

.. _ot-converge:

Convergence with operational transformation
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The coweb framework resolves the consistency problem introduced by concurrent editing by implementing an `operational transformation`_ (OT) algorithm. OT determines if an *operation* performed by a remote user is "out-of-date" when the local user receives it because other operations were received or performed locally in the meantime. When such a discrepancy is found, the OT algorithm *transforms* the incoming operation to account for the differences between the local application state and the state of the application when the remote user actually performed the operation. The transformation potentially adjusts the *value* and *position* of the operation to account for the differences in state. The resulting event can be handled as if it was performed locally, on the current application state.

To better understand the basics of OT, return to the case where Alice and Bob edit the `bananas` shopping list item at the same time. In OT terms, Alice performs an *update* operation on the item at position zero in the shopping list with a value of `apples`. Likewise, Bob performs an *update* operation with a value of `oranges` to the item at the same position. Again, each user sees his or her own update immediately while each event is sent to the other user.

.. figure:: /images/ot-openg.png
   :alt: Diagram of how OT resolves the conflicting edit between Alice and Bob.
   :target: ../_images/ot-openg.png
   
   Diagram of operational transformation for conflict resolution. After all outstanding events are processed, Alice and Bill both see `apples`.

When Alice receives Bob's edit, the OT algorithm processes the incoming operation. First, it notes that Alice's application is not in the same state as Bob's when he made his edit. The algorithm transforms the value of Bob's update (`oranges`) to account for the local update already made by Alice (`apples`). In this update-vs-update transformation, the algorithm simply picks a winner based on some consistent, global property guaranteed to be the same across users of the application. Let's say, in this implementation, the alphabetical ordering of the user's name decides the outcome, so OT chooses **A**\lice's value of `apples` over **B**\ob's. The algorithm then replaces the `oranges` value on Bob's event with `apples`. The OT algorithm finishes by detecting that no other operations were seen by Alice other than her own edit before Bob's event arrived. 

Alice's shopping list can now apply Bob's transformed operation. In this case, the operation has no effect. The first item in Alice's shopping list reads `apples` and Bob's transformed event also sets it to `apples`. 

Now consider what happens when Bob receives Alice's edit. Again, the OT algorithm running on his machine notices Bob's application is in a newer state than Alice's when she performed her edit. OT transforms the value of Alice's update (`apples`) to account for the local update made by Bob (`oranges`). The OT algorithm uses the alphabetical ordering of their names to pick a winner, and again **A**\lice's value trumps **B**\ob's. The value of the operation is left as `apples`. OT processing completes as no other operations were seen by Bob while Alice's event was in transit.

Bob's shopping list can now apply Alice's transformed operation. The application updates the first item in the list to the value of `apples`. At this point, if no other events are in flight between Alice and Bob, they are looking at the same shopping list. OT has yielded consistency between their shopping lists in the face of concurrent edits.

The convergence guarantee of OT also applies to more complicated situations. For example, recall the complex case where Bob's network is slow, and both Alice and Cathy manage to insert and delete ten new items before receiving Bob's one edit. After the OT algorithm run by all three users processes all outstanding events, all three users are guaranteed to be looking at the same shopping list state. This outcome of operational transformation is its key contribution to cooperative web applications.

The operation engine
~~~~~~~~~~~~~~~~~~~~

The :term:`operation engine` component of the coweb framework uses an operational transformation algorithm to ensure convergence. The operation engine is responsible for processing all incoming cooperative events and transforming them as needed. After processing, the framework delivers events, transformed or not, to the local instance of the application in the same manner using the :doc:`collaboration API </js/collab>`.

.. figure:: /images/layers-openg.png
   :alt: Diagram of event flow from Alice to Bob.
   :target: ../_images/layers-openg.png
   
   Depiction of Alice sending an event to Bob. The operation engine stores the event details on Alice's browser for future use in case of conflicting edits. The operation engine in Bob's browser checks and transforms Alice's event to account for any local conflicts.

The key feature of the coweb operation engine design is that an application can remain ignorant of state inconsistencies and operational transformation. In return, the application must satisfy two higher-level requirements for the operation engine to guarantee convergence:

#. An application must properly set all fields of the cooperative events it sends (*outbound events*).
#. An application must honor the values of all fields of cooperative events it receives (*inbound events*).

The following sections discuss these requirements in detail with the cooperative shopping list serving as a running example.

.. _coshop-design:

Interlude: Cooperative shopping list 
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Before continuing, it is important to state assumptions about the design of the hypothetical shopping list application. Given this context, it is possible to explain the full range of features supported by the operation engine in the |coweb api|.

#. The shopping list is a one-dimensional list containing item names.
#. The list items appear in the same order for all users.
#. Each list item in the list can hold free-form text editable by the user.
#. Edits to list items take effect when the user hits :kbd:`Enter`, not character-by-character.
#. Multiple users can edit the same list item at the same time.
#. The shopping list is one of many cooperative widgets in the application.

A tutorial describing the implementation of a shopping list with slightly different features (hence, different use of the operation engine) is available elsewhere in the framework documentation under the title :doc:`/tutorial/shopping`.

Outbound events
~~~~~~~~~~~~~~~

Applications use the :func:`CollabInterface.sendSync` method to send cooperative events. The method takes four parameters representing the info the operation engine needs attached to each event to guarantee convergence: `name`, `value`, `type`, and `position`. The local operation engine stores a copy of all outbound coweb events for later comparison and transformation with incoming events, with the exception of `null` type events (see :ref:`coevent-type-null` below).

Event name
##########

The event name identifies what part of the application generated the event. This identifier serves two purposes. First, it allows an application to register observers for specific events by name using :func:`CollabInterface.subscribeSync`. Second, it determines which events the operation engine inspects for potential conflicts: events with the same name.

In the shopping list example, Bob's edit from `bananas` to `oranges` might result in an event named `shoppinglist.change` identifying the shopping list as the source of his edit. Alice, modifying the same list, would produce an event with exactly the same name when making her change from `bananas` to `apples`. Cathy, making changes to an independent chat widget in the same application would generate an event with a different name, say `chat.msg`. 

If Bob's and Alice's events are sent concurrently, they are processed for conflicts when received because they share the same name. If Cathy's chat event is sent at the same time, it is never treated as conflicting with Bob's and Alice's shopping list edits because its name differs.

Event value
###########

The event value is JSON-encodable data representing the change made to an application instance. The value attribute exists to allow one application instance to inform its counterparts about its change in a manner those remote instances can understand.

Alice's change to the shopping list results in an event with value `apples`. Bob's change is an event with value `oranges`. Cathy's event with name `chat.msg` might have value `Do we really need all these groceries?` 

Event type
##########

The event type indicates how the event changed the application state. This attribute exists to inform the operation engine about how to transform  conflicting events. The supported types and their meaning are described below.

.. _coevent-type-null:

Null type
+++++++++

An application sets the event type to `null` when the event has no chance of conflicting with a concurrent event sent by another user. An event with null-type bypasses the operation engine completely both when outbound and inbound.

Say the shopping list application has a widget that lets the user set the text color of their shopping list edits. Alice might choose red while Bob chooses green, orange, purple, or even red too. The application sends these selections as events of type `null` because Alice and Bob's choices are independent of one another.

Update type
+++++++++++

An application sets the event type to `update` when the event represents a change to a shared application property. The edits made by Alice and Bob to change `bananas` to `apples` and `oranges` respectively are examples of `update` events. Both their edits change an existing item in the shopping list.

Insert type
+++++++++++

An application sets the event type to `insert` when the event represents the creation of a new item in a shared, one-dimensional set of items (e.g., an array, a string of characters). For example, imagine Cathy adds a new item to the shopping list named `pears`. Because the :ref:`shopping list design <coshop-design>` states the items are ordered for all users, Cathy's addition is an `insert` event.

Delete type
+++++++++++

An application sets the event type to `delete` when the event represents the removal of an existing item from a shared, one-dimensional set of items (e.g., an array, a string of characters). Pretend now that Cathy decides to remove `bananas` from the list. Because the :ref:`shopping list design <coshop-design>` states the items are ordered for all users, Alice's edit is a `delete` event.

Deletion events have no value associated with them. As a result, the `value` field on all `delete` type events is `null`.

Event position
##############

The event position indicates which item in a one-dimensional is changing. The position attribute exists separately from the value attribute because the operation engine must inspect and potentially transform the position on conflicting events.

Alice's change from `bananas` to `apples` is an `update` at position 0. Likewise, Bob's change is another `update` at position 0. If Cathy inserts `pears` after `bananas` in her list, her event is an `insert` at position 1.

Inbound events
~~~~~~~~~~~~~~

Applications use the :func:`CollabInterface.subscribeSync` method to observe cooperative events from remote instances. The subscribed callback function  receives five parameters when invoked: `topic`, `value`, `type`, `position`, and `site`. The *meaning* of the first four correspond roughly with the event outbound event properties described above while the fifth, `site`, simply indicates where the even originated. The *data* stored in the `value` and `position` attributes, however, may differ from those set on the original outbound event. The operation engine transforms incoming events that are out-of-date by adjusting these two fields as needed to account for events already received.

.. rst-class:: openg-it 

+------------------+--------+----------+----------+
|                  | Update | Insert   | Delete   |
+==================+========+==========+==========+
| **Update**       | value  | position | pos/drop |
+------------------+--------+----------+----------+
| **Insert**       | no-op  | position | position |
+------------------+--------+----------+----------+
| **Delete**       | no-op  | position | pos/drop |
+------------------+--------+----------+----------+

.. rst-class:: openg-it

Table of transforms where row is the inbound event type and column is a previously received and stored event type.

Value adjustments
#################

The operation engine may change the `value` property of any inbound `update` event based on previously processed `update` events. This adjustment resolves conflicts between simultaneous changes to the same application property.

Consider again the concurrent updates made by Alice and Bob from `bananas` to `apples` and `oranges`. As described under :ref:`ot-converge`, the engine notes the conflict between the two edits and picks a "winner" consistently on both machines. If the engine picks `apples` (Alice's original edit), Bob's subscribed callback receives Alice's coweb event unchanged. Alice's callback, on the other hand, receives Bob's event with the `value` switched from `oranges` (Bob's original edit) to `apples`.

.. figure:: /images/value-openg.png
   :alt: Value adjustment for an update-update conflict.
   :target: ../_images/value-openg.png
   
   Diagram showing how the operation engine adjusts the value on the update event inbound to Alice.

The operation engine never adjusts the `value` property on inbound `insert` or `delete` events. The engine does nothing to their values because no conflicting event of any type can impact their value properties.

To illustrate this point, imagine Cathy inserts `pears` ahead of bananas in the list while Alice is busy making concurrent edits. Cathy's `insert` creates a new item which Alice has yet to receive. It is impossible for Alice to be concurrently updating, creating, or deleting the value of Cathy's new item because her application is not even aware of it yet.

Now imagine Cathy deletes `bananas` while Alice is busy making edits. Cathy's event carries no value only the position of the deleted item in the list. It is nonsensical for Alice's operation engine instance to add a value to it and so it leaves Alice's `delete` event alone, with `null` value.

Position adjustments
####################

The operation engine may change the `position` property of any inbound event based on previously processed `insert` and `delete` events. This adjustment resolves conflicts arising from concurrent additions to and deletions from an ordered set of items.

For example, imagine Bob decides to insert `oranges` as a new item at the top of the list instead of replacing `bananas`. Meanwhile, Alice does decide to change `bananas` to `apples`. When Alice receives Bob's event, her operation engine notes it as out-of-date and transforms it against Alice's local update. This transform is a no-op so Bob's insert passes through to Alice's application callback unchanged.

When Bob receives Alice's event, his operation engine notes it as out-of-date and transforms it against his local insert. In this case, Bob's insert increased the position of the target of Alice's event, `bananas`, by one. The engine compensates by adjusting the `position` attribute on Alice's event by one, changing it from zero to one. Bob's application callback receives the transformed event and updates the item in position one, `bananas`, to the event value of `apples`, not Bob's new `oranges` item in position zero.

.. figure:: /images/pos-openg.png
   :alt: Position adjustment for an insert-update conflict.
   :target: ../_images/pos-openg.png 
   
   Diagram showing how the operation engine adjusts the position of the update event inbound to Bob.

Continuing this example, if Cathy decides to delete `oranges` while Bob changes `apples` back to `bananas`, another position adjustment will be made when Cathy receives Bob's event. In this case, Cathy's engine will subtract one from the position on Bob's event to account for her concurrent removal of the `oranges` item from the top of the list.

Dropped events
##############

Finally, the operation engine may drop inbound events (i.e., fail to deliver them to subscribed callbacks) based on previously processed `delete` events. This adjustment resolves conflicts arising from concurrent edits to and deletions from an ordered set.

Now pretend Alice deletes `bananas`, the item at position zero, while Bob changes it to `oranges`. When Bob receives Alice's event, his operation engine notes it as out-of-date and transforms it against his local update. Prior `update` events have no effect on inbound `delete` events as noted in the table of transforms above, so the operation engine leaves Alice's event unchanged. Bob's application receives the event and deletes the first item in the shopping list.

When Alice receives Bob's event, her operation engine transforms it against her local delete. The `position` attribute on the inbound `update` is the same as the `position` of the item she previously deleted: zero. Because its target no longer exists, the inbound `update` has no meaning so the operation engine simply drops it. Alice's application receives no notification of Bob's event, but remains in the same, matching state as Bob's.

.. figure:: /images/drop-openg.png
   :alt: Position adjustment for an insert-update conflict.
   :target: ../_images/drop-openg.png 
   
   Diagram showing how the operation engine drops an update event inbound to Alice.

A final word
~~~~~~~~~~~~

After reading all the gory details in this section, you're now an expert on the inner workings of the operation engine. If not, don't worry. Nearly all of these details are hidden from coweb applications. Remember, all you need to do is figure out the correct parameters to :func:`CollabInterface.sendSync` and honor all the parameters in your :func:`CollabInterface.subscribeSync` callback. The framework will do the rest.

For a concrete example putting these guidelines into code, be sure to read  :doc:`/tutorial/shopping`.

.. seealso::

   `Operational Transformation <http://en.wikipedia.org/wiki/Operational_transformation>`_
      Wikipedia article

   `Operational Transformation FAQ <http://cooffice.ntu.edu.sg/otfaq/>`_
      Frequently asked questions about operational transformation