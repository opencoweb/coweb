.. reviewed 0.4
.. include:: /replace.rst

Properly using the OpenCoweb sync API
-------------------------------------

In order to create correct collaborative web applications using the OpenCoweb API, :doc:`/intro/openg` introduction states that your application must follow two rules:

#. An application must properly set all fields of the cooperative events it sends (*outbound events*).
#. An application must honor the values of all fields of cooperative events it receives (*inbound events*).

These rules form a very simple and powerful mechanism to write collaborative web applications. However, the above rules only provide for `syntactical` correctness, not `semantic` correctness. The underlying Operational Transformation engine by design is completely agnostic to higher level meaning of the data structures it manages.

Illustrating Example: Characters vs. Words [1]_
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

To illustrate the difference, consider a shared document of raw text. The underlying data structure is a single sequence of character (i.e. a ``String`` or ``character array``). Consider the following scenario with two clients working on the shared document.

1. Client 1 and client 2 both have their text string set to ``Helo everybody!``.
2. Client 1, noticing the misspelling of ``Hello``, changes its local copy of the text to ``Hello everybody!``.
3. Client 2 deletes the misspelled word completely, and ends up  the string ``Bye everybody!``.

The operational transform engine, understanding only how to keep two sequences of items consistent, transforms the text of both clients into ``Byel everybody!``. That the underlying semantic value was lost in the transformation might seem like an unavoidable consequence, working at a different granularity level might improve the functionality of the collaborative text editor.

For example, instead of working with a sequence of characters, our text editor's underlying data structure could be a sequence of words (disregarding punctuation, etc). Unfortunately, there exist examples [citation] where the operational transform engine still loses some semantic value.

In general, working at a higher granularity level "usually translates into a more semantically consistent final result. " [1]_

Rich Text Editor: More Subtle Example [2]_
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Now, let us consider a more complex collaborative application, a rich text editor. The underlying data representation is an HTML encoded string. As one client make changes to the rich text, a sequence of `inserts`, `updates`, and `deletes` are sent out to other clients. As long as other clients honor whatever remote sync events come in, the underlying HTML encoded string is guaranteed to be consistent across all clients.

Consider the following scenario with two clients working on a rich text document.

1. Client 1 and client 2 both have their HTML string set to ``<br>``.
2. Client 1 changes its local HTML to ``<b>A</b><br>``, and sends the following sync events (`type`, `position`, `value`).

  * ``insert 2 >``
  * ``insert 3 A``
  * ``insert 4 <``
  * ``insert 5 /``
  * ``insert 6 b``
  * ``insert 7 >``
  * ``insert 8 <``
  * ``insert 9 b``

3. Client 2 simultaneously changes its local HTML to ``S``, and sends the following sync events (`type`, `position`, `value`).

  * ``delete 0 null``
  * ``delete 0 null``
  * ``delete 0 null``
  * ``update 0 S``

4. The operational transform, noting that simulateous conflicting operations have occured, will send the following remote sync events to client 1.

  * ``insert 0 >``
  * ``insert 1 A``
  * ``insert 2 <``
  * ``insert 3 /``
  * ``insert 4 b``
  * ``insert 5 >``
  * ``insert 6 <``
  * ``insert 7 b``

5. And sends the following remote events to client 2.

  * ``delete 0 null``
  * ``delete 0 null``
  * ``delete 8 null``
  * ``delete 8 S``

As long as both clients honor their remote sync events (steps 4 and 5), the final HTML of both clients will converge to ``>A</b><bS``. This is a perfect example that the operational transform engine provides syntaxtic consistency (the data structure, a list of characters, converged for both clients). However, the higher level semantic information was ignored, and in the end we were left with malformed HTML.

The issue is more subtle - only when two clients make changes to the same part of the document, also changing higher level HTML semantics, will the issue manifest itself. This issue is also much more difficult to recover from: in the above example of a raw text editor, when semantic value is lost, clients can regain semantic consistency with relative ease. With the rich text editor, we would obviously like for clients to be presented with a set of buttons and menus that control the rich text data (bold, font-size, etc) and that clients never see the underlying HTML string itself. When the HTML string is mangled into ``>A</b><bS``, what should our application do?

Again, working at a higher level of granularity provides better functionality. Considering the rich text document as a DOM tree (as the browser internally recognizes it), we can separate the embeded HTML tags and attributes from the textual data. This approach will avoid the issue of clients ending up with malformed HTML.

Hints: Working with complex data structures
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The operational transform engine assumes a linear sequence of data. When working with non-linear data (ex: two dimensional arrays, hierarchical tree data), special case must be taken when mapping complex data structure operations to the simple set of operations that the OpenCoweb API provides.

Tree structured data
####################

Tree structured information is very useful and in many cases the most obvious choice of represent data (ex: XML). Care must be taken when using the OpenCoweb API to maintain consistent tree structured data. See the CoTree demo for a more in depth discussion of how to maintain a collaborative tree.

To see one of the subtle considerations when working with tree data, consider the following tree with two clients working simultaneously on it (the example assumes we are using CoTree's design for syncing).

* A (the root)

  * B

    * D

    * E

    * F

  * C

    * G

    * H

    * I

Suppose client 1 deletes node ``B``, sending the sync event ``delete(A, 0)`` indicating a delete of ``A``'s children position ``0``. Simultaneously, client 2 adds a child to ``B``, sending the sync ``insert(B, 3)`` indicating an insert to B's children at position 3. The operation engine will notice that the sync events are for different objects (one for node ``A``, one for node ``B``), so there is no conflict and the events are not transformed.

However, when client 1 receives the remote ``insert``, it will be unable to honor the event since node ``B`` no longer exists! In this special case, all clients must make sure that the node to operate on actually exists, and cannot rely on the operation engine to drop this seemingly conflict ``insert``.

Conclusions
~~~~~~~~~~~

Both examples above demonstrate the subtleties of using the OpenCoweb API to synchronize collaborative web applications. The API guarantees syntactic consistency, i.e. that all clients who follow the above two rules will have their underlying data structures converge to the same values. The API, however, makes no guarantees about semantic consistency, i.e. higher level meaning of the underlying data structure - this is up to the application writer.

While the first example illustrates how semantic value is lost in the form of word meaning, usually is it not that big a deal for clients to add back in the semantic value. In the second example, however, should the rich text editor lose the HTML semantic value, clients will likely be unable to continue editing the document as the loss of HTML encoding is too devastating. Keeping the underlying data as a DOM tree instead of a raw HTML string, avoids this major semantic loss. Application designers must consider the tradeoff of what level of granularity to work with.

Thus, applications designers should take into account how to ensure semantic consistency, and the appropriate level of granularity at which to work in order to provide the best functionality and ease-of-use for clients.

References
~~~~~~~~~~

.. [1] C.-L. Ignat and M. C. Norrie, "Tree-based model algorithm for maintaining consistency in real-time collaborative editing systems," Workshop on Collaborative Editing, CSCW 2002, New Orleans, Louisiana, USA, Nov. 2002.
.. [2] "Issue #185: CoEditor Unable to Reconcile Simultaneous Changes." June 2012. <https://github.com/opencoweb/coweb/issues/185>.
