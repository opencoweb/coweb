.. include:: /replace.rst

Creating a cooperative shopping list
------------------------------------

This tutorial explains how to build a cooperative shopping list application step-by-step. You start the tutorial by creating a single-user shopping list based on the Dojo :class:`dojox.grid.DataGrid` widget and :class:`dojo.data.ItemFileWriteStore` data store. Working through the tutorial, you will incrementally add coweb features including cooperative editing of list items, support for latecomers to the session, and basic awareness of where other users are editing.

The goal: A cooperative shopping list
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

To get started, first consider the application requirements. Note that these are slightly different from the ones described in the simpler example used throughout :doc:`/intro/openg`.

#. The shopping list has two attributes per item, name and quantity.
#. Any user can add, delete, or change any list item at any time.
#. Each cell in the list can hold free-form text editable by the user.
#. Edits to list items take effect when the user hits :kbd:`Enter`, not character-by-character.
#. Users can sort their views of the list independently of one another.
#. The list highlights which rows users have focused to assist collaboration.

The final version of our application will look something like the following.

.. figure:: ../images/colist.png
   :alt: Finished coweb shopping list application.
   
   Screenshot of the complete cooperative shopping list application.

Setup a coweb server instance
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The shopping list application requires a coweb server to operate. If you deployed the Java :file:`coweb_example.war` file or created a Python demo virtualenv according to the :doc:`install` instructions, your server environment has a copy of the completed application. You should view it now to better understand the features you are implementing. The default URL for the complete app is `http://your.domain:9000/www/examples/colist/index.html` on a Python or `http://your.domain:8080/coweb_example/colist/index.html` on a Java server.

If you plan to develop your own copy of the shopping list application, you should create and deploy your code in a new Java WAR or a fresh coweb Python virtualenv. Follow the instructions below to setup a workspace for development.

Java
####

#. Satisfy the Java servlet container and dependency install prerequisites under :doc:`install`.
#. Create the directory :file:`servers/java/mycolist` in the |coweb api| source tree where your application source will reside.
#. Create a build script that produces a :file:`mycolist.war` which includes:

   #. Your web application source.
   #. The Java dependencies under :file:`servers/java/deps/jars`.
   #. The JavaScript dependencies under :file:`servers/java/deps/js`.
   #. The built coweb Java framework files :file:`servers/java/coweb_bots/coweb_bots.jar` and :file:`servers/java/coweb_server/coweb_server.jar`.
   #. The coweb JavaScript framework files :file:`www/libs/coweb.js` and :file:`www/libs/coweb`.

Python
######

#. Create and activate a new, :ref:`empty coweb virtualenv <empty-virtualenv>`.
#. Make a folder under :file:`/desired/virtualenv/path/www/mycolist` where your application will reside.
#. Run the coweb server in the project virtualenv, choosing a port that won't conflict with another server instance.

   .. sourcecode:: console
   
      $ run_server.py --port=9001

Starting with a blank page
~~~~~~~~~~~~~~~~~~~~~~~~~~

You will start by creating an empty web application shell that loads the proper dependencies.

:file:`index.html`
##################

First, create a new file named :file:`index.html` in your project folder. This file will eventually contain the Dojo widgets for the shopping list. For now, it will just show some simple text so that you can test the app deployment.

Java
++++

If you plan to deploy your app on the Java server, seed :file:`index.html` with the following markup. This markup uses a local copy of Dojo. It assumes all of the JavaScript and CSS dependencies reside under a :file:`js/libs` folder. 

Keep in mind that you may need to adjust the various CSS and JavaScript paths depending on how you build your WAR file.

.. sourcecode:: html

   <!DOCTYPE html>
   <html>
     <head>
       <meta charset="utf-8" />
       <title>Cooperative Shopping List Example</title>
       <style type="text/css">
         @import "js/libs/dojo/resources/dojo.css";
         @import "js/libs/dijit/themes/claro/claro.css";
         @import "js/libs/dojox/grid/resources/Grid.css";
         @import "js/libs/dojox/grid/resources/claroGrid.css";
         @import "js/libs/coweb/ext/ui/styles/claro/claro.css";
         @import "colist.css";
       </style>
       <script type="text/javascript">
         var djConfig = {
             cowebAdminUrl: '/mycolist/admin',
             isDebug: false,
             parseOnLoad: false,
             modulePaths: {
               'coweb' : 'js/libs/coweb',
               'colist' : '/coweb_mycolist'
             }
         };
       </script>
       <script type="text/javascript" src="js/libs/dojo/dojo.js"></script>
       <script type="text/javascript" src="js/libs/dojo/OpenAjax.js"></script>
       <script type="text/javascript" src="comap.js"></script>
     </head>
     <body class="claro">
       <h1>Hello World!</h1>
     </body>
   </html>

Python
++++++

If you plan to deploy your app on the Python server, seed :file:`index.html` with the following instead. This markup uses Dojo 1.5 from Google's CDN instead of requiring a local copy. It also sets script and CSS paths relative to the defaults in the :file:`run_server.py` startup script.

.. sourcecode:: html

   <!DOCTYPE html>
   <html>
     <head>
       <meta charset="utf-8" />
       <title>Cooperative Shopping List Example</title>
       <style type="text/css">
         @import "http://ajax.googleapis.com/ajax/libs/dojo/1.5/dojo/resources/dojo.css";
         @import "http://ajax.googleapis.com/ajax/libs/dojo/1.5/dijit/themes/claro/claro.css";
   		  @import "http://ajax.googleapis.com/ajax/libs/dojo/1.5/dojox/grid/resources/Grid.css";
   		  @import "http://ajax.googleapis.com/ajax/libs/dojo/1.5/dojox/grid/resources/claroGrid.css";
         @import "../../libs/coweb/ext/ui/styles/claro/claro.css";
         @import "colist.css";
       </style>
       <script type="text/javascript">
         var path = window.location.pathname.split('/');
         path.pop();
         path = path.join('/');
         var djConfig = {
             isDebug: false,
             parseOnLoad: true,
             modulePaths: {
               'coweb' : 'coweb',
               'dojox.cometd' : 'dojox/cometd',
               'org.cometd' : 'org/cometd',
               'colist' : path
             },
             baseUrl : '../../libs/'
         };
       </script>
       <script type="text/javascript" src="http://ajax.googleapis.com/ajax/libs/dojo/1.5/dojo/dojo.xd.js"></script>
       <script type="text/javascript" src="http://ajax.googleapis.com/ajax/libs/dojo/1.5/dojo/OpenAjax.js"></script>
       <script type="text/javascript" src="colist.js"></script>
     </head>
     <body class="claro">
       <h1>Hello World!</h1>
     </body>
   </html>

:file:`colist.js`
#################

Next create the :file:`colist.js` file in your project folder. This file will contain the code that runs on page load. By the end of the tutorial, it will initialize local widgets and join the application to a coweb session. Start by seeding the file with the following content.

.. sourcecode:: javascript

   dojo.require('coweb');

   dojo.ready(function() {
       console.log('ready callback');
   });

The :func:`dojo.ready` function registers a callback that will fire after the DOM finishes loading, all Dojo modules finish loading, and all declarative Dojo widgets in the DOM are instantiated. For the time being, the :func:`console.log` statement in the callback gives you something to check to ensure all the dependencies are loading without error.

:file:`colist.css`
##################

Now create the :file:`colist.css` file in your project folder. You will define styles for the widgets in the shopping list as you add them. For now, leave it blank.

Checkpoint: Running the blank application
#########################################

You should test your application at this point to ensure you can access it in a web browser after deploying it. If you're working with Java, run your build script and deploy your :file:`mycolist.war` file in your servlet container. If you're working with Python, do nothing: your application is already web accessible at :file:`/www/mycolist` by default.

If everything is working properly, the following should be possible in your application:

#. Your application should load when you visit it in your browser.
#. The JavaScript console should show the result of the log statement.

Adding the shopping list
~~~~~~~~~~~~~~~~~~~~~~~~

After confirming the basic application loads, you can proceed to add widgets to it. To satisfy the application requirements, you will include:

* A :class:`dojox.grid.DataGrid` widget with two columns, one for an item name and one for an amount
* A :class:`dojo.data.ItemFileWriteStore` to hold the data in the shopping list
* Two :class:`dijit.form.Button` widgets, one to add new items and one to delete selected items

All three of these classes are stock Dojo components, unaware of cooperative web events. You will first add them to the application as-is to make sure the shopping list works locally. When the application works properly standalone, then you will go about extending it for cooperation.

:file:`index.html`
##################

Open the :file:`index.html` file again. Remove the placeholder `<h1>` you added to the body in the prior section. Add the declarative markup for the Dojo widgets shown below as children of the `<body>` element.

.. sourcecode:: html

   <div dojoType="dijit.layout.BorderContainer" 
           design="headline" 
           gutters="false" 
           liveSplitters="false"
           id="container">
      <div dojoType="dijit.layout.ContentPane"
           region="top"
           id="controls">
        <button id="addRowButton"
                type="button"
      	        dojoType="dijit.form.Button">Add Item</button>
      	<button id="removeRowButton"
      	        type="button"
      	        dojoType="dijit.form.Button">Delete Item</button>
      </div>
      <table id="grid"
             dojoType="dojox.grid.DataGrid"
             autoWidth="true" 
             rowSelector="20px"
             disabled="true"
             columnReordering="true"
             region="center">
        <thead>
          <tr>
            <th width="400px" field="name" editable="true">Item</th>
            <th width="200px" field="amount" editable="true">Amount</th>
          </tr>
        </thead>
      </table>
   </div>

The :class:`dijit.layout.BorderContainer` splits the application template area into regions. A :class:`dijit.layout.ContentPane` containing the add and remove :class:`dijit.form.Button` widgets occupies the top region. The :class:`dojox.grid.DataGrid` fills the center region.

The grid table defines two columns labeled :guilabel:`Item` and :guilabel:`Amount`. The columns are tied via their `field` attributes to the `name` and `amount` attributes of items in the :class:`dojo.data.ItemFileWriteStore`.

:file:`colist.js`
#################

Edit the :file:`colist.js` file. Under the existing :func:`dojo.require` call at the top of the file, add the following additional calls to import the required Dojo widgets.

.. sourcecode:: javascript

   dojo.require('dojox.grid.DataGrid');
   dojo.require('dojo.data.ItemFileWriteStore');
   dojo.require('dijit.form.Button');

Next, replace the :func:`console.log` call in the :func:`dojo.ready` callback with the following code.

.. sourcecode:: javascript

    /**
     * Adds a new row with default values to the local grid.
     */
    function onAddRow() {
        // make pseudo-unique ids
        var date = new Date();
        var id = String(Math.random()).substr(2) + String(date.getTime()); 
        dataStore.newItem({
            id: id,
            name: 'New item',
            amount: 0
        });
    };

    /**
     * Removes all selected rows from the grid.
     */
    function onRemoveRow() {
        grid.removeSelectedRows();
    };
    
    // configure the grid datastore, starting it empty
    var emptyData = {identifier : 'id', label : 'name', items: []};
    var dataStore = new dojo.data.ItemFileWriteStore({data : emptyData});
    var grid = dijit.byId('grid');
    grid.setStore(dataStore);
    
    // listen to and enable add/delete buttons
    var addButton = dijit.byId('addRowButton');
    var removeButton = dijit.byId('removeRowButton');
    dojo.connect(addButton, 'onClick', onAddRow);
    dojo.connect(removeButton, 'onClick', onRemoveRow);

When the DOM finishes loading and includes the parsed Dojo widgets, your ready callback creates a :class:`dojo.data.ItemFileWriteStore`, sets it as the model of the :class:`dojox.grid.DataGrid`, and registers the :func:`onAddRow` and :func:`onRemoveRow` as click handlers for the `Add Item` and `Delete Item` buttons in the markup.

:file:`colist.css`
##################

Open the :file:`colist.css` file. Add the following style rules to center the grid and buttons properly.

.. sourcecode:: css

   html, body {
       margin: 0px;
       padding: 0px;
       overflow: hidden;
       width: 100%;
       height: 100%;
   }

   #container {
       width: 100%;
       height: 100%;
   }

   #controls {
       margin: 10px;
       text-align: center;
   }

   .dj_ie7 #controls {
       text-align: left;
   }

   #grid {
       width: 80%;
       border: 1px solid silver;
       margin: 10px auto;
   }

Checkpoint: Running the standalone app
######################################

Sharing data store changes
~~~~~~~~~~~~~~~~~~~~~~~~~~

:file:`colist.js`
#################

.. todo:: cleanup

The :func:`onAddRow` function assigns IDs to items based on the current time and a random number instead of using the default, monotonically increasing IDs created by the :class:`dojo.data.ItemFileWriteStore` instance. Though not important yet, these unique IDs 

The use of random IDs is important for their pseudo-uniqueness across the many users editing the shopping list simultaneously in a session. If all instances of our application counted up from zero, the operation engine would be continually resolving conflicts not only in data values but in the assignment of IDs to items in the data store. The generated IDs are unique enough that you need not worry about multiple instances of our application assigning the same ID to two or more newly created rows. In other words, you can assume all distinct rows have unique identifiers, even when their creation is distributed across remote machines.


:file:`CoopItemFileWriteStore.js`
#################################

Initialization
++++++++++++++

Callbacks for local changes
+++++++++++++++++++++++++++

Callbacks for remote changes
++++++++++++++++++++++++++++

:file:`application.js`
######################

Checkpoint: Checking data store cooperation
###########################################

Intermission: About conflict resolution
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Supporting late-joiners
~~~~~~~~~~~~~~~~~~~~~~~

:file:`CoopItemFileWriteStore.js`
#################################

Checkpoint: Testing data store improvements
###########################################

Providing remote user awareness
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

:file:`CoopGrid.js`
###################

:file:`application.js`
######################

Checkpoint: Checking grid highlights
####################################

Going further
~~~~~~~~~~~~~