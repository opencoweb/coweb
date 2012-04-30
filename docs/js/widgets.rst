.. reviewed 0.4
.. include:: /replace.rst

Included collaborative widgets
------------------------------

A web application can optionally make use of several prebuilt collaborative javascript widgets. This guide will explain how to access these widgets from within a coweb app, and assumes you have followed the :doc:`/tutorial/install` guide to deploy a coweb server and application using either the Java or Python server.

Require coweb and cowebx namespaces
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

If you deployed a prebuilt coweb application using the coweb-boilerplates github repository, you can skip to the next section, as both coweb and cowebx are already available to you.

Otherwise, see :doc:`config` for information on how to configure your application to access the coweb and cowebx namespaces.

Widget catalog
~~~~~~~~~~~~~~

All widgets and widget examples conform to the `Asynchronous Module Definition`_ (AMD) format.

RichTextEditor
##############

   A collaborative rich text editor with realtime synchronization across all clients and attendee list. All parameters to this function are passed as name/value properties on a single `args` object. Only the `collabID` parameter is required.

.. sourcecode:: javascript

   require(['cowebx/dojo/RichTextEditor/RichTextEditor'], function(TextEditor) {
      var editor = new TextEditor({collabID:'foobar'},dojo.byId('editorNode'));
   }

.. function:: getValue( )

   Get the current text value of the editor
   :returns: string

.. function:: insertChar(character, position)

   Insert char into editor programmatically.
   :param string character: character to insert
   :param int position: position to insert character at
   :returns: null

.. function:: deleteChar(position)

   Delete char from editor programmatically.
   :param int position: position of character to remove
   :returns: null

.. function:: updateChar(character, position)

   Update char in editor programmatically.
   :param string character: character with which to replace position with
   :param int position: position to replace character at
   :returns: null

BasicTextareaEditor
###################

   A collaborative textarea element with realtime synchronization across all clients.

.. sourcecode:: javascript

   require(['cowebx/dojo/BasicTextareaEditor/TextEditor'], function(TextEditor) {
      var editor = new TextEditor({'domNode':dojo.byId('editorNode'),id:'textEditor'});
   }

.. function:: getValue( )

   Get the current text value of the editor
   :returns: string

.. function:: insertChar(character, position)

   Insert char into editor programmatically.
   :param string character: character to insert
   :param int position: position to insert character at
   :returns: null

.. function:: deleteChar(position)

   Delete char from editor programmatically.
   :param int position: position of character to remove
   :returns: null

.. function:: updateChar(character, position)

   Update char in editor programmatically.
   :param string character: character with which to replace position with
   :param int position: position to replace character at

EnhancedTextareaEditor
######################

   A collaborative textarea element supporting whole-area styling with realtime synchronization across all clients.

.. sourcecode:: javascript

   require(['cowebx/dojo/EnhancedTextareaEditor/TextEditor'], function(TextEditor) {
      var editor = new TextEditor({'domNode':dojo.byId('editorNode'),id:'textEditor'});
   }

.. function:: getValue( )

   A web application calls this method to get the current text value of the editor.
   :returns: string

.. function:: insertChar(character, position)

   Insert char into editor programmatically.
   :param string character: character to insert
   :param int position: position to insert character at
   :returns: null

.. function:: deleteChar(position)

   Delete char from editor programmatically.
   :param int position: position of character to remove
   :returns: null

.. function:: updateChar(character, position)

   Update char in editor programmatically.
   :param string character: character with which to replace position with
   :param int position: position to replace character at
   :returns: null

GMap
####

   A collaborative Google Map with realtime synchronization across all clients.

.. sourcecode:: javascript

   require(['cowebx/dojo/GMap/GMap'], function(TextEditor) {
      var map = new GMap({},domNode);
   }

ChatBox
#######

  A collaborative Chat Box with realtime synchronization across all clients.

.. sourcecode:: javascript

   require(['cowebx/dojo/ChatBox/ChatBox'], function(TextEditor) {
      var chat = new ChatBox({},domNode);
   }

