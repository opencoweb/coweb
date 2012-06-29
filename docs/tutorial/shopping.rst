.. reviewed 0.4
.. include:: /replace.rst

Creating a cooperative shopping list
------------------------------------

This tutorial explains how to build a cooperative shopping list application step-by-step. You start the tutorial by creating a single-user shopping list based on the Dojo :class:`dojox.grid.DataGrid` widget and :class:`dojo.data.ItemFileWriteStore` data store. Working through the tutorial, you will incrementally add coweb features including cooperative editing of list items, support for latecomers to the session, and basic awareness of where other users are editing.

.. note:: 

    Following this tutorial *should* produce a logically equivalent version of the OCW demo found in :file:`cowebx/cowebx-apps/colist`.

The goal: A cooperative shopping list
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

To get started, first consider the application requirements. Note that these are slightly different from the ones described in the simpler example used throughout :doc:`/intro/openg`.

#. The shopping list has two attributes per item, name and quantity.
#. Any user can add, delete, or change any list item at any time.
#. Each cell in the list can hold free-form text editable by the user.
#. Edits to list items take effect when the user hits :kbd:`Enter`, not character-by-character.
#. The list highlights rows that have remote user input focus.

The final version of our application will look something like the following.

.. figure:: ../images/colist.png
   :alt: Finished coweb shopping list application.
   
   Screenshot of the complete cooperative shopping list application.

Setup a coweb server instance
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The shopping list application requires a coweb server to operate. If you deployed the Java :file:`launcher.war` file (the :file:`cowebx/cowebx-apps/launcher` module), your server environment has a copy of the completed application. You should view it now to better understand the features you are implementing. The default URL for the complete app is `http://your.domain:8080/colist`.

Note you can also bring up the colist application by itself (:file:`launcher.war` brings up *all* OCW demos, but the WAR file generated from the :file:`cowebx/cowebx-apps/colist` module will also deploy the colist application to `http://your.domain:8080/colist`).

If you plan to develop your own copy of the shopping list application, you should create and deploy your code in a new Java WAR. Follow the instructions below to setup a workspace for development.

Java
####

#. Use the :ref:`coweb Maven archetype <maven-archetype>` to initialize a new `mycolist` project. Choose an appropriate groupId (e.g. ``com.yourdomain``) and artifactId (e.g. ``mycolist``).

   .. sourcecode:: console

      $ cd /desired/project/path
      $ mvn archetype:generate \
         -DarchetypeGroupId=org.opencoweb \
         -DarchetypeArtifactId=coweb-archetype

#. Run the application using or deploy it to your servlet container of choice. Pick a custom port if the default (8080) conflicts with another server.

   .. sourcecode:: console

      $ cd mycolist
      $ mvn jetty:deploy-war -Djetty.port=9001

Starting with a blank page
~~~~~~~~~~~~~~~~~~~~~~~~~~

You will start by creating an empty web application shell that loads the proper dependencies.

:file:`index.html`
##################

First, create an :file:`index.html` in your project folder if on does not already exist. This file will eventually contain the Dojo widgets for the shopping list. For now, it will just show some simple text so that you can test the app deployment.

.. note:: 

   For a Java project, all web files live under the :file:`mycolist/src/main/webapp` folder created by the archetype.

Seed the :file:`index.html` with the following markup. If you initialized the project using the Maven archetype, replace the default content.

.. sourcecode:: html

   <!DOCTYPE html>
   <html>
     <head>
       <meta charset="utf-8" />
       <title>Cooperative Shopping List Example</title>
       <link rel="stylesheet" href="colist.css" type="text/css" />
       <script type="text/javascript" src="./config.js"></script>
       <script type="text/javascript" src="http://ajax.googleapis.com/ajax/libs/dojo/1.7.0/dojo/dojo.js"></script>
       <script type="text/javascript" src="./main.js"></script>
     </head>
     <body class="claro">
       <h1>Hello World!</h1>
     </body>
   </html>

:file:`config.js`
#################

Now, create a :file:`config.js` in the project folder. This file configures Dojo 1.7.0.

.. sourcecode:: javascript

    var dojoConfig = {
        baseUrl: '/mycolist',
        async:true,
        
        paths : {
           coweb : 'lib/coweb',
           cowebx: 'lib/cowebx',
           org : 'lib/org'
        },
        
        packages:[{
            name: 'dojo',
            location:'http://ajax.googleapis.com/ajax/libs/dojo/1.7.0/dojo',
            main:'main'
        },
        {
            name: 'dijit',
            location:'http://ajax.googleapis.com/ajax/libs/dojo/1.7.0/dijit',
            main:'main'
        },
        {
            name: 'dojox',
            location:'http://ajax.googleapis.com/ajax/libs/dojo/1.7.0/dojox',
            main:'main'
        }]
    };

:file:`main.js`
###############

Next create a :file:`main.js` file in your project folder. This file configures the coweb JavaScript APIs and loads the actual :file:`colist.js` (defined below) using Dojo's Asynchronous Module Definition (AMD) API.

.. sourcecode:: javascript

   // session admin loop configured under same path as app page
   var cowebConfig = {adminUrl : './admin'};
   require(['colist']);

:file:`colist.js`
#################

Next create the :file:`colist.js` file in your project folder. This file will contain the application specific code that runs on page load. By the end of the tutorial, it will initialize local widgets, join the application to a coweb session, and send/receive OCW sync events. Start by seeding the file with the following content.

.. sourcecode:: javascript

    define([
        "dojo",
        "coweb/main",
    ], function(coweb) {

        var CoListApp = function() {
        };
        var proto = CoListApp.prototype;

        proto.init = function() {
            console.log("ready callback");
        };

        var app = new CoListApp();
        dojo.ready(function() {
            app.init();
        });
    });

The :func:`define` call indicates this JavaScript module is in AMD format. Its first parameter, an array, indicates other modules and/or plain scripts to load. `dojo` contains basic Dojo library code, and `coweb/main` refers to the main module of the |coweb api|. The arguments passed to the callback are the resolved dependencies.

.. note:: This tutorial and the complete example use the CDN version of Dojo to limit the number of dependencies you must install. If you use Dojo 1.7.0 for your own applications, you should use a local, built copy of Dojo to improve your application's performance.

Calling :func:`dojo.ready` will wait for the DOM to finish loading the web page, then invoke the callback.

For the time being, the :func:`console.log` statement in the callback gives you something to check to ensure all of the dependencies are loading without error.

:file:`colist.css`
##################

Now create the :file:`colist.css` file in your project folder. You will define styles for the widgets in the shopping list as you add them. For now, add the following import statements to pull in the necessary Dojo Claro theme stylesheets.

.. sourcecode:: css

   @import "http://ajax.googleapis.com/ajax/libs/dojo/1.7.0/dojo/resources/dojo.css";
   @import "http://ajax.googleapis.com/ajax/libs/dojo/1.7.0/dijit/themes/claro/claro.css";
   @import "http://ajax.googleapis.com/ajax/libs/dojo/1.7.0/dojox/grid/resources/Grid.css";
   @import "http://ajax.googleapis.com/ajax/libs/dojo/1.7.0/dojox/grid/resources/claroGrid.css";

Checkpoint: Running the blank application
#########################################

You should test your application at this point to ensure you can access it in a web browser after deploying it. Run your build script and deploy your :file:`mycolist.war` file in your servlet container. Visit the application in your browser at http://localhost:9001/mycolist/index.html, modifying the port as appropriate to where your server is running.

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
                 autoWidth="false" 
                 rowSelector="20px"
                 disabled="true"
                 columnReordering="true"
                 region="center">
            <thead>
              <tr>
                <th width="80%" field="name" editable="true">Item</th>
                <th width="20%" field="amount" editable="true">Amount</th>
              </tr>
            </thead>
        </table>
    </div>

The :class:`dijit.layout.BorderContainer` splits the application template area into regions. A :class:`dijit.layout.ContentPane` containing the add and remove :class:`dijit.form.Button` widgets occupies the top region. The :class:`dojox.grid.DataGrid` fills the center region.

The grid table defines two columns labeled :guilabel:`Item` and :guilabel:`Amount`. The columns are tied via their `field` attributes to the `name` and `amount` attributes of items in the :class:`dojo.data.ItemFileWriteStore`.

:file:`colist.js`
#################

Edit the :file:`colist.js` file. You will add some modules dependencies to the first argument of :func:`define`. Right now, :file:`colist.js` only depends on `dojo` and `coweb/main`, so change the dependencies so the beginning of the file looks like the following. Your module function will also expand its argument list so that it can use the loaded modules.

.. sourcecode:: javascript

    define([
        "dojo",
        "dijit/registry",
        "coweb/main",
        "dojox/grid/DataGrid",
        "dojo/data/ItemFileWriteStore",
        "cowebx/dojo/BusyDialog/BusyDialog",
        "dojo/_base/array",
        "dijit/form/Button",
        "dijit/layout/BorderContainer",
        "dijit/layout/ContentPane"
    ], function(dojo, dijit, coweb, DataGrid, ItemFileWriteStore, BusyDialog, arrays) {

Next, change the :func:`CoListApp.prototype.init` function contents to the following.

.. sourcecode:: javascript

    proto.init = function() {
        // Parse declarative widgets.
        dojo.parser.parse();

        this.grid = dijit.byId("grid");
        this.grid.canSort = function() { return false; } // Disable column sorting.
        this.dataStore = null; // This will be set each time by buildList.
        this.dsHandles = {}; // See _dsConnect.

        this.initCollab();

        /* This is what we store internally - the list state is an array of objects.
           Each object has three properties: id, name, and amount. */
        this.bgData = [];
        this.buildList()

        // Map from DataGrid row ID to its position in the grid. See onRemoveRow and onLocalDelete.
        this.removed = {};

        // Listen to and enable add/delete buttons.
        var addButton = dijit.byId("addRowButton");
        var removeButton = dijit.byId("removeRowButton");
        dojo.connect(addButton, "onClick", this, "onAddRow");
        dojo.connect(removeButton, "onClick", this, "onRemoveRow");

    };

Add the following to the CoListApp prototype.

.. sourcecode:: javascript

    /**
     * Adds a new row with default values to the local grid. Note that we don't send the event to
     * remove clients yet - see ItemFileWriteStore.onNew and the app.onLocalInsert callback.
     */
    proto.onAddRow = function() {
        // make pseudo-unique ids
        var date = new Date();
        var id = String(Math.random()).substr(2) + String(date.getTime());
        this.dataStore.newItem({
            id: id,
            name: "New item",
            amount: 0
        });
    };

    /**
     * Removes all selected rows from the grid. Note that we don't send the event to remove clients
     * yet - see ItemFileWriteStore.onDelete and the app.onLocalDelete callback.
     */
    proto.onRemoveRow = function() {
        var selected = this.grid.selection.getSelected();
        // Remember the positions of the removed elements.
        arrays.forEach(selected, function(item) {
            this.removed[this.dataStore.getIdentity(item)] = this.grid.getItemIndex(item);
        }, this);
        this.grid.removeSelectedRows();
    };

    /**
      * Uses this.bgData to re-build the DataGrid.
      */
    proto.buildList = function() {
        var emptyData = {data:{identifier:"id", label:"name", items:[]}};
        var store = new ItemFileWriteStore(emptyData);
        arrays.forEach(this.bgData, function(at) {
            store.newItem(at);
        });

        this.dataStore = store;
        this.grid.setStore(store);
    };

    /**
      * To be filled in later in the tutorial.
      */
    proto.initCollab = function() { };

When the DOM finishes loading and :func:`app.init()` is called, Dojo parses the DOM for declarative Dojo widgets, initializes some internal state, and sets up the initial grid state. :func:`app.init()` also registers callbacks for the Add and Remove buttons.

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

:file:`pom.xml`
###############

Now, open the :file:`pom.xml` file in the project root directory. The BusyDialog object is a OCW widget found in the package ``cowebx-widgets-dojo``. Add the following **overlay** to the **overlays** section.

.. sourcecode:: xml

    <overlay>
        <groupId>org.opencoweb.cowebx</groupId>
        <artifactId>cowebx-widgets-dojo</artifactId>
        <type>war</type>
        <excludes>
            <exclude>META-INF/**</exclude>
            <exclude>WEB-INF/**</exclude>
        </excludes>
        <targetPath>lib/cowebx/dojo</targetPath>
    </overlay>

Add the following dependency at the end of the file with the rest of the dependencies.

.. sourcecode:: xml

    <dependency>
        <groupId>org.opencoweb.cowebx</groupId>
        <artifactId>cowebx-widgets-dojo</artifactId>
        <version>${coweb-version}</version>
        <type>war</type>
    </dependency>

Checkpoint: Running the standalone app
######################################

You should test your application now to ensure the shopping list widgets work. The following should be possible now in your application:

#. You can click the :guilabel:`Add` button to create a new row in the grid.
#. You can double-click cells in the :guilabel:`Item` and :guilabel:`Amount` columns and edit their contents.
#. You can use the :kbd:`Tab` key to put focus in the grid, the arrow keys to move focus among the grid cells, and the :kbd:`Enter` key to start editing the focused cell.
#. You can drag and drop the column headers to reorder them.
#. You can use the mouse and keyboard to select one or more rows and then click the :guilabel:`Delete` button to remove them.

Joining a session
~~~~~~~~~~~~~~~~~

Once satisfied that your shopping list works, you can begin making it cooperative. You should focus first on getting your application into a coweb session.

:file:`colist.js`
#################

Open the :file:`colist.js` file again. Add the following code to the bottom of the init function.

.. sourcecode:: javascript

    // Get a session instance.
    var sess = coweb.initSession();
    sess.onStatusChange = function(status) {
        console.log(status);
    }
    BusyDialog.createBusy(sess); // This is a widget in cowebx-widgets-dojo. Make sure to have the dependency in the pom.xml.
    sess.prepare();
        
This code initializes the :class:`SessionInterface` and initiates the session :ref:`prepare <proto-session-prepare>`, :ref:`join <proto-session-join>`, and :ref:`update <proto-session-update>` sequence summarized below:

#. The :class:`SessionInterface` instance contacts the :attr:`cowebConfig.adminUrl` to prepare the coweb session. The admin responds with the URL of the session the application should join.
#. The instance contacts the session URL and performs the necessary handshake and event subscriptions.
#. The instance waits to receive the latest shared state, broadcasts it to the application when received, and finally notifies the application that it is ready to send and receive cooperative events.

Checkpoint: Running the standalone app
######################################

You should test your application again to see if it joins a session now. You can verify this behavior by looking in the developer console of your browser for the expected status change notifications: `preparing`, `joining`, `updating`, `ready`.

Sharing data store changes
~~~~~~~~~~~~~~~~~~~~~~~~~~

Now that the application can join a session, it's time to make the primary editing operations of the shopping list cooperative: add, update, and remove. When a user performs one of these operations, all application instances in the session should reflect the change. Further, all instances should converge to the same list of items, even in the face of concurrent conflicting edits.

Fortunately, the :class:`dojo.data.ItemFileWriteStore` class supports callbacks whenever an item is added to, changed in, or removed from the data store. By registering for these callbacks, the application can send notices of changes in the local data store to remote data store instances whenever they occur. Conversely, the app can listen for changes from remote data stores and apply them to the local store.

As for conflict resolution and consistency, the application can rely solely on the operation engine in the coweb framework. If the application passes proper values to :func:`CollabInterface.sendSync`, the engine will deliver results to :func:`CollabInterface.subscribeSync` callbacks transformed to resolve conflicts.


:file:`colist.js`
#################

To get started, fill in the :func:`CoListApp.prototype.initCollab` method.

.. sourcecode:: javascript


    /**
      * Creates our application's lone collaborative element: the shopping list.
      * Also, connect callbacks for collab events.
      *
      * If our application had other collaborative elements (a text editor, chat box, etc).
      * we would initialize other collab objects, for example with coweb.initCollab({id: "texteditor"}).
      */
    proto.initCollab = function() {
        // Create a collab object for our shopping list.
        this.collab = coweb.initCollab({id : "shoppinglist"});
        /* Listen to remove sync events with a topic of `change`. Our shopping list will
           only send updates through this one topic so that the OT engine can detect list
           operation conflicts. */
        this.collab.subscribeSync("change", this, "onRemoteChange");

    };

Look at the :func:`CollabInterface.subscribeSync` call. The first parameter indicates the name of the remote, cooperative event to observe. In this case, the instance wants to observe all remote events with topic `change`. As you will see below, our callbacks for local changes send events with topic `change` whenever an item is added, updated, or removed in the local data store. In effect, this :func:`CollabInterface.subscribeSync` call is registering for notifications of remote additions, updates, or removals in remote data stores.

Next add method :func:`_dsConnect`, :func:`_connectAll`, :func:`_disconnectAll`. You will use this private method repeatedly throughout the code to connect and disconnect callbacks to and from the local data store instance.

.. sourcecode:: javascript

    /**
      * Disconnect all listeners from the data store.
      */
    proto._disconnectAll = function() {
        this._dsConnect(false, "insert");
        this._dsConnect(false, "update");
        this._dsConnect(false, "delete");
    };

    /**
      * Connect all listeners to the data store.
      */
    proto._connectAll = function() {
        this._dsConnect(true, "insert");
        this._dsConnect(true, "update");
        this._dsConnect(true, "delete");
    };

    /**
      * Static object that maps data store events to methods on this instance for
      * ease of connecting and disconnecting data store listeners.
      */
    CoListApp.typeToFuncs = {
        "update": {ds : "onSet", coop: "onLocalUpdate"},
        "insert": {ds : "onNew", coop: "onLocalInsert"},
        "delete": {ds : "onDelete", coop: "onLocalDelete"}
    };

    /**
     * Connects or disconnects the observer method on this instance to one
     * of the data store events.
     *
     * @param connect True to connect, false to disconnect
     * @param type "insert", "update", or "delete"
     */
    proto._dsConnect = function(connect, type) {
        if (connect) {
            // get info about the data store and local functions
            var funcs = CoListApp.typeToFuncs[type];
            // do the connect
            var h = dojo.connect(this.dataStore, funcs.ds, this, funcs.coop);
            // store the connect handle so we can disconnect later
            this.dsHandles[type] = h;
        } else {
            if (!this.dsHandles[type])
                return;
            // disconnect using the previously stored handle
            dojo.disconnect(this.dsHandles[type]);
            // delete the handle
            this.dsHandles[type] = null;
        }
    };

The method uses :func:`dojo.connect` and :func:`dojo.disconnect` to enable and disable the callback methods you will define shortly. The `type` parameter identifies which data store notification / callback pair should be enabled or disabled.

Callbacks for local changes
+++++++++++++++++++++++++++

You should now add the methods responsible for sending information about local changes to remote application instances. To do so, you first need a method that can serialize the an opaque item in the :class:`dojo.data.ItemFileWriteStore` to JSON for transmission. Create this method with the name :func:`_itemToRow` as follows:

.. sourcecode:: javascript

    /**
     * Serializes a flat item in the data store to a regular JS object with 
     * name/value properties.
     *
     * @param item Item from the data store
     * @return row Object
     */
    proto._itemToRow = function(item) {
        var row = {};
        arrays.forEach(this.dataStore.getAttributes(item), function(attr) {
            row[attr] = this.dataStore.getValue(item, attr);
        }, this);
        return row;
    };

This method takes any item from the data store as a parameter, loops over all of its attributes, and adds their names and values to a regular JavaScript object. The coweb framework can JSON-encode the new object to send to remote users whereas it cannot JSON-encode the original item, because the item has circular references.

Next define the callback methods for changes in the local :class:`dojo.data.ItemFileWriteStore` instance. The three callback names should match those stated in the :attr:`typesToFuncs` object (:func:`onLocalInsert`, :func:`onLocalUpdate`, :func:`onLocalDelete`) and their signatures should match those of the data store methods to which they are connected (:func:`onNew`, :func:`onSet`, :func:`onDelete`).

.. sourcecode:: javascript

    /**
     * Called when a new item appears in the local data store. Sends the new
     * item data to remote data stores.
     *
     * @param item New item object
     * @param parentInfo Unused
     */
    proto.onLocalInsert = function(item, parentInfo) {
        // get all attribute values
        var row = this._itemToRow(item);
        var value = {row:row};

        var id = this.dataStore.getIdentity(item);
        var pos = this.grid.getItemIndex(item);
        this.bgData.splice(pos, 0, row);
        this.collab.sendSync("change", value, "insert", pos);
    };

When a new item appears in the data store, this :func:`onLocalInsert` method first collects its values using :func:`_itemToRow`. Second, it packages the `row` object as the value to transmit. Third, it gets the identity and position of the new item. Finally, it invokes the :func:`CollabInterface.sendSync` method to send the cooperative event to remote instances.

.. sourcecode:: javascript

    /**
     * Called when an attribute of an existing item in the local data store
     * changes value. Sends the item data and the name of the attribute that
     * changed to remote data stores.
     *
     * @param item Item object that changed
     * @param attr String attribute that changed
     * @param oldValue Previous value of the attr
     * @param newValue New value of the attr
     */
    proto.onLocalUpdate = function(item, attr, oldValue, newValue) {
        // get all attribute values
        var row = this._itemToRow(item);

        // store whole row in case remote needs to reconstruct after delete
        // but indicate which attribute changed for the common update case
        var value = {};
        value.row = row;
        value.attr = attr;

        var id = this.dataStore.getIdentity(item);
        var pos = this.grid.getItemIndex(item);
        this.bgData[pos][attr] = row[attr];
        this.collab.sendSync("change", value, "update", pos);
    };

When the attribute of an item in the data store changes value, this :func:`onLocalUpdate` method serializes and sends the item in much same manner as :func:`onLocalInsert`. The only difference is that this method includes the name of the attribute that changed in addition to the `row` data to assist remote instances in determining what changed.

.. sourcecode:: javascript
    
    /**
     * Called when a item disappears from the local data store. Sends just the
     * id of the removed item to remote data stores.
     *
     * @param item Deleted item
     */
    proto.onLocalDelete = function(item) {
        // get all attribute values
        // name includes row id for conflict resolution
        var id = this.dataStore.getIdentity(item);
        var pos = this.removed[id];
        delete this.removed[id];
        this.bgData.splice(pos, 1);
        // Update this.removed data structure in case any positions need to be re-aligned.
        for (var k in this.removed) {
            if (this.removed[k] > pos)
                --this.removed[k];
        }
        this.collab.sendSync("change", null, "delete", pos);
    };

When an item disappears from the data store, this :func:`onLocalDelete` method notifies remote instances of the deletion. Unlike the two methods above, it does not include the values of the removed item as they are no longer needed. The position is obtained by looking up the ``this.removed`` map - see :func:`onRemoveRow`.

Finally, add the following line to the end of :func:`buildList` to actually connect the :func:`onLocalInsert`, :func:`onLocalUpdate`, and :func:`onLocalDelete` callbacks to data store changes.

.. sourcecode:: javascript

    this._connectAll();

Callbacks for remote changes
++++++++++++++++++++++++++++

Just as the class must inform remote instances of local data store changes, it must also listen for messages about remote changes and integrate them into the local data store. You should now define the methods that will observe and process remote changes.

In :func:`initCollab`, you subscribed a method named :func:`onRemoteChange` as the callback for `change` cooperative events. Define this method as follows:

.. sourcecode:: javascript

    /**
     * Called when a remote data store changes in some manner. Dispatches to
     * local methods for insert, update, delete handling.
     *
     * @param args Cooperative web event
     */
    proto.onRemoteChange = function(args) {
        var value = args.value;
        if (args.type === "insert") {
            this.onRemoteInsert(value, args.position);
        } else if (args.type === "update") {
            this.onRemoteUpdate(value, args.position);
        } else if (args.type === "delete") {
            this.onRemoteDelete(args.position);
        }
    };

The code in this method looks at the `type` property of the event value and dispatches to more specific methods shown below. Remember, the `type` was set by the code in :func:`onLocalInsert`, :func:`onLocalUpdate`, or :func:`onLocalDelete`: whichever sent the cooperative event.

Now define the method to add remotely created items to the local data store.

.. sourcecode:: javascript

    /**
     * Called when a new item appears in a remote data store. Creates an item
     * with the same id and value in the local data store.
     *
     * @param value Item data sent by remote data store
     * @param position Where to insert the new item.
     */
    proto.onRemoteInsert = function(value, position) {
        // This is the unfortunate case we must rebuild the data grid (since I can't insert at arbitrary position...).
        this.bgData.splice(position, 0, value.row);
        this.buildList();
    };

Remote inserts are simple - add the new row data in the internal ``bgData`` array, then rebuild the list. We must rebuild the list, because Dojo's DataGrid does not make it a simple task to insert a row at an arbitrary position.

Now define the methods needed to incorporate remote changes to existing items and remove remotely deleted items.

.. sourcecode:: javascript

    /**
     * Called when an item attribute changes value in a remote data store.
     * Updates the attribute value of the item with the same id in the local
     * data store.
     *
     * @param value Item data sent by remote data store
     * @param position Which item to update.
     */
    proto.onRemoteUpdate = function(value, position) {
        var item = this.grid.getItem(position);
        this._dsConnect(false, "update");

        var attr = value.attr;
        var newVal = value.row[attr];
        this.bgData[position][attr] = newVal;
        this.dataStore.setValue(item, attr, newVal);

        this._dsConnect(true, "update");
    };

    /**
     * Called when an item disappears from a remote data store. Removes the
     * item with the same id from the local data store.
     *
     * @param position Which item to delete.
     */
    proto.onRemoteDelete = function(position) {
        var item = this.grid.getItem(position);
        this._dsConnect(false, "delete");

        this.bgData.splice(position, 1);
        this.dataStore.deleteItem(item);

        this._dsConnect(true, "delete");
    };

The code in these two functions is a little more complicated - we update the ``bgData`` array, but then we must update the DataGrid data store so the client sees the change to the shopping list. This is better than having to rebuild the entire list as we did for a remote insert.

Checkpoint: Checking data store cooperation
###########################################

You should test your application now to confirm cooperation between two or more grids. The easiest way to perform this test is to open at least two browser windows on the same machine and then make edits in each. In addition to the features from the previous checkpoint, the following should be possible in your application at this point:

#. The busy dialog appears over your application while it attempts to join a session.
#. When you add a row in one shopping list, it appears in all of the others.
#. When you change an item name or amount in one list, the change occurs in the others.
#. When you delete one or more items in a list, the items are removed in other lists.
#. When an item name or value is updated in two or more lists simultaneously, the same value wins out in all of the lists so that they remain consistent.

Supporting late-joiners
~~~~~~~~~~~~~~~~~~~~~~~

With the current code, people who join a session late do not see any items added to the shopping list before they joined. The list stays in its empty, initial state. You should now add the necessary callbacks so that a late joining data store instance can initialize to the current state. To accomplish this, you must also define the callback that allows data store instances already in the session to provide their state to late comers.

:file:`colist.js`
#################################

Open the :file:`colist.js` file. At the bottom of :func:`initCollab`, add the following lines of code to register the full state request and response callbacks.

.. sourcecode:: javascript

        /* Listen for requests from remote applications joining the session when they ask
           for the full state of this widget. */
        this.collab.subscribeStateRequest(this, "onGetFullState");

        /* Listen for responses from remote applications when this application instance
           joins a session so it can bring itself up to the current state. */
        this.collab.subscribeStateResponse(this, "onSetFullState");

Next, define the :func:`onGetFullState` callback function you just registered. The coweb framework invokes this method when a remote instance of this class is joining the session and needs to synchronize its state.

.. sourcecode:: javascript

    /**
     * Called when a remote instance of this widget is joining a session and
     * wants to get up to speed. This instance sends the joining one a
     * serialized array of all the items in the data store.
     *
     * @param token Object with properties for the ready event (see doc).
     */
    proto.onGetFullState = function(token) {
        this.collab.sendStateResponse(this.bgData, token);
    };

When invokved, this callback simply sends the internal state of the shopping list (the ``bgData`` array). The token passed to this callback and provided to :func:`sendStateResponse` pairs the request for state with the eventual response.

Now implement the :func:`onSetFullState` callback you registered in the constructor. The coweb framework invokes this method when this instance is joining an on-going session and receives full state from a remote instance.

.. sourcecode:: javascript

    /**
     * Called when this instance of the widget is joining a session and wants
     * to get up to speed. A remote instance provides this widget with an
     * array of all the items in the data store.
     *
     * @param bgData Array of row objects to be inserted as items.
     */
    proto.onSetFullState = function(bgData) {
        this.bgData = bgData;
        this.buildList();
    };

Again, this callback is really simple - it keeps a reference to the delivered ``bgData`` array, then rebuilds the Data Grid.

Checkpoint: Testing data store improvements
###########################################

You should test your application now to confirm late joining browsers immediately see the up-to-date shopping list. The easiest way to perform this test is to open at least two browser windows on the same machine, make changes to the list, and then refresh one of the browsers. The state of the list in the refreshed browser should match that of the list in the other browser.

Providing remote user awareness
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Now that the shopping list items are properly shared, you can focus on providing information about shopping list users. The initial requirements stated that users should be aware of where other users are editing the shopping list. To do so, you should highlight where remote user input focus lies in the :class:`dojox.grid.DataGrid` widget.

:file:`CoopGrid.js`
###################

Create a new file in the application folder named :file:`CoopGrid.js`. Add the following code to the file.

.. sourcecode:: javascript

   define([
       'coweb/main'
   ], function(coweb) {
       var CoopGrid = function(args) {
           this.grid = args.grid;
           this.id = args.id;
           if(!this.grid || !this.id) {
               throw new Error('missing dataStore or id argument');
           }
           // tracks focus info for remote instances of this widget, key: site id,
           // value: object with focused datastore item id and attr in the 
           // focused column
           this.focused = {};
           // this user's site id
           this.site = null;
           // listen for focus and style events on the grid
           dojo.connect(this.grid, 'onCellFocus', this, 'onFocusLocalCell');
           dojo.connect(this.grid, 'onStyleRow', this, 'onStyleRow');
           // initialize collab interface using the dojo widget id as the
           // id for the collab instance
           this.collab = coweb.initCollab({id : this.id});
           // listen for 'focus' messages sent by remote instances of this widget
           this.collab.subscribeSync('focus', this, 'onFocusRemoteCell');
           // listen for when this app instance is in the session and ready to 
           // send and receive events
           this.collab.subscribeReady(this, 'onReady');
           // listen for other sites leaving the session so we can cleanup their
           // focus tracking information
           this.collab.subscribeSiteLeave(dojo.hitch(this, 'onSiteLeave'));
           // listen for requests from remote applications joining the session
           // when they ask for the full state of this widget
           this.collab.subscribeStateRequest(dojo.hitch(this, 'onGetFullState'));
           // listen for responses from remote applications when this application
           // instance joins a session so it can bring itself up to the current 
           // state
           this.collab.subscribeStateResponse(dojo.hitch(this, 'onSetFullState'));        
       };
       var proto = CoopGrid.prototype;
    
       /**
        * Called when this local application instance is joined to a session and
        * has already received full state from another attendee in the session.
        * Stores the site id of this instance for later use.
        *
        * @param params Object with properties for the ready event (see doc)
        */
       proto.onReady = function(params) {
           this.site = params.site;
       };

       /**
        * Called when a remote application instance leaves the session. Removes
        * focus information for the leaving site and refreshes the grid view.
        *
        * @param params Object with properties for the ready event (see doc)
        */
       proto.onSiteLeave = function(params) {
           delete this.focused[params.site];
           this.grid.render();
       };

       /**
        * Called when a remote instance of this widget is joining a session and
        * wants to get up to speed. This instance send the joining one the list of
        * focused items.
        *
        * @param params Object with properties for the ready event (see doc)
        */
       proto.onGetFullState = function(token) {
           this.collab.sendStateResponse(this.focused, token);
       };

       /**
        * Called when this instance of the widget is joining a session and wants
        * to get up to speed. A remote instance provides this widget with its list
        * of focused items. This widget forces its grid to redraw so it can mark
        * those focused items.
        *
        * @param focused The state of the focused grid cells sent by a remote
        *   widget instance in its onGetFullState method
        */
       proto.onSetFullState = function(focused) {
           this.focused = focused;
           this.grid.render();
       };

       /**
        * Called when the grid is styling a row for display. Adds the class name
        * 'tutFocus' to any row that is focused in a remote instance of the grid.
        * Decides which rows to mark as focused based on item ids, NOT row index,
        * because the sort order might be different across remote instances of
        * the grid.
        *
        * @param row Row object including the row index as one of its properties
        */
       proto.onStyleRow = function(row) {
           // get the item shown in the row
           var item = this.grid.getItem(row.index);
           // abort if we couldn't find the item for this row
           if(!item) { return; }
           // get the id of the item shown in the row
           var id = this.grid.store.getIdentity(item);
           // look through which rows are focused
           for(var site in this.focused) {
               if(this.focused.hasOwnProperty(site)) {
                   // add the css class to rows that are focused in remote grids
                   // but ignore local
                   site = Number(site);
                   if(this.focused[site] === id && site !== this.site) {
                       row.customClasses += ' focused';
                   }
               }
           }
       };

       /**
        * Called when the user gives focus (keyboard or mouse) to a certain cell.
        * Figures out which item is shown in the row containing the focus.
        * Also figures out which attribute is shown in the selected column.
        * Sends the information to remote instances of this widget.
        *
        * @param cell Focused cell object from grid
        * @param rowIndex Index of row containing the focused cell
        */
       proto.onFocusLocalCell = function(cell, rowIndex) {
           // get item associated with row containing the focused cell
           var item = this.grid.getItem(rowIndex);
           // get identity of the item
           var id = this.grid.store.getIdentity(item);
           var value = {id : id};
           // send sync with no consistency maintenance
           this.collab.sendSync('focus', value, null);
           // store local focus too for late joiners
           this.focused[this.site] = id;
       };

       /**
        * Called when a remote widget instance reports focus on a cell.
        * Stores the id of the item associated with the row that is now focused
        * so it can be styled the next time the grid renders itself.
        *
        * @param args Received cooperative event
        */
       proto.onFocusRemoteCell = function(args) {
           // store the selected id and the site that has it selected
           this.focused[args.site] = args.value.id;
           this.grid.render();
       };
    
       return CoopGrid;
   });

The :class:`CoopGrid` class registers callbacks for grid focus and styling events when instantiated. It also registers observers for cooperative events concerning entry into a session, focus events from remote instances, notifications that remote instances of have left a session, and full state requests and responses for late joining. 

At runtime, the instance tracks which row in the grid the local user has given input focus. It sends the data store item ID of the local focused row to remote instances. When the local instance receives notification of a remote focus, it stores the ID of the focused item in a dictionary keyed by the unique site ID of the remote instance. The local instance forces its grid to re-render when it receives a remote change notification, and adds the CSS class `focused` to all remotely focused rows.

When a remote user leaves the session, the local :class:`CoopGrid` instance clears any information about that user's site in its dictionary and forces a grid render to remove its focus row highlight. When the local user joins a session late, the local instance receives a copy of the focus dictionary from a remote instance. It then forces a render of the grid to immediately show the current focus state for all remote users. Likewise, when a remote user joins a session late, the local :class:`CoopGrid` instance is able to provide the newcomer with its current focus dictionary.

:file:`colist.css`
##################

Open :file:`colist.css` and add the following CSS rule.

.. sourcecode:: css

   #grid .focused {
      color: red;
   }

:file:`colist.js`
#################

Open the :file:`colist.js` file for the last time. Add the `CoopGrid` module dependency.

.. sourcecode:: javascript

    define([
        "dojo",
        "dijit/registry",
        "coweb/main",
        "dojox/grid/DataGrid",
        "dojo/data/ItemFileWriteStore",
        "cowebx/dojo/BusyDialog/BusyDialog",
        "dojo/_base/array",
        "CoopGrid",
        "dijit/form/Button",
        "dijit/layout/BorderContainer",
        "dijit/layout/ContentPane"
    ], function(dojo, dijit, coweb, DataGrid, ItemFileWriteStore, BusyDialog, arrays, CoopGrid) {
      // etc.
   });

Also, instantiate an instance of the class in :func:`init` (at the end of the function is fine).

.. sourcecode:: javascript

    // Instantiate our cooperative grid extension, giving it a reference to the dojox.grid.DataGrid widget.
    args = {grid : this.grid, id : "colist_grid"};
    var coopGrid = new CoopGrid(args);

Checkpoint: Checking grid highlights
####################################

Your application now meets all of the requirements we set forth at the beginning of this tutorial. You should test it using multiple browsers. In addition to the features from the previous checkpoint, the following should be possible in your finished application:

#. The text of a row is black when no remote user has focus on that row.
#. The text of a row is red when a remote user puts keyboard focus on that row.
#. When a user leaves the session, the focus for that user is no longer shown.

Providing a custom Updater Type Matcher
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

By default the type of updater assigned to late joiners of sessions is selected randomly. Some applications may need to provide more control over which type of updater is selected. For example if the application has different types of clients such as mobile or desktop clients ensuring that a mobile updater type is used for mobile client late joiners and the desktop one for desktop clients might be a requirement.

For the shopping list application we are first going to enable it to specify the type of updater the joining client is. The updater type will be optionally specified as a URL query parameter called 'updaterType' and passed in to the session prepare code. 'updaterType' is also an optional parameter for the 'join' API.

:file:`colist.js`
#################

.. sourcecode:: javascript

    function getURLParams() {
        var urlParams = {};
        var searchText = window.location.search.substring(1);
        var searchSegs = searchText.split('&');
        for(var i=0, l=searchSegs.length; i<l; i++) {
            var tmp = searchSegs[i].split('=');
            urlParams[decodeURIComponent(tmp[0])] = decodeURIComponent(tmp[1]);
        }
        return urlParams;
    }

In :func:`init`, add the following before the call to ``sess.prepare()``.

.. sourcecode:: javascript

    var urlParams = getURLParams();
    var updaterType = urlParams['updaterType'] === undefined  ? 'default' : urlParams['updaterType'];
    // do the prep
    sess.prepare({updaterType: updaterType});

Now that an updater type can be specified by clients, a custom Updater Type Matcher can be written that will be able to select the type of updater based on the type of the updatee. The following is a java example that demonstrates a custom matcher that looks for 4 different types (type1, type2, type3, type4). type1 will be matched for type1 and also type3, type2 will be matched for type2 and type4. type3 and type4 will only match their own type.

:file:`src/main/java/com/yourdomain/ExampleUpdaterTypeMatcher.java`
###################################################################

.. sourcecode:: java

    package com.yourdomain;

    import java.util.Arrays;
    import java.util.HashMap;
    import java.util.List;
    import java.util.Map;
    import org.coweb.UpdaterTypeMatcher;

    public class ExampleUpdaterTypeMatcher implements UpdaterTypeMatcher {
        private Map<String, List<String>> updaterTypeLookup = null;
        public ExampleUpdaterTypeMatcher() {
            updaterTypeLookup = new HashMap<String, List<String>>();
            updaterTypeLookup.put("type1", Arrays.asList(new String[]{"type1", "type3"}));
            updaterTypeLookup.put("type2", Arrays.asList(new String[]{"type2", "type4"}));
            updaterTypeLookup.put("type3", Arrays.asList(new String[]{"type3"}));
            updaterTypeLookup.put("type4", Arrays.asList(new String[]{"type4"}));
        }
        public String match(String updateeType, List<String> availableUpdaterTypes) {
            String match = null;
            for (String availableUpdaterType : availableUpdaterTypes) {
                List<String> matches = updaterTypeLookup.get(availableUpdaterType);
                if (matches != null && matches.contains(updateeType)) {
                    match = availableUpdaterType;
                    break;
                }
            }
            System.out.println("ExampleUpdaterTypeMatcher called to obtain a match for ["+updateeType+"] match = ["+match+"]");
            return match;
        }
    }

To configure the java ``UpdaterTypeMatcher``, add the following option to your :file:`WEB-INF/cowebConfig.json` (if one doesn't exist, create it). 

.. sourcecode:: json

    "updaterTypeMatcher": "com.yourdomain.ExampleUpdaterTypeMatcher"

Make sure your :file:`WEB-INF/web.xml` file uses cowebConfig.json. Check that your ``org.coweb.servlet.AdminServlet`` servlet descriptor has an ``init-param`` option for ConfigURL.

.. sourcecode:: xml

    <servlet>
        <servlet-name>admin</servlet-name>
        <servlet-class>org.coweb.servlet.AdminServlet</servlet-class>
        <init-param>
            <param-name>ConfigURI</param-name>
            <param-value>/WEB-INF/cowebConfig.json</param-value>
        </init-param>
        <load-on-startup>2</load-on-startup>
    </servlet>

You should now be able to specify an **updaterType** on the shopping list applications URL and see logging information indicating which updater type was selected for late joiners.

Going further
~~~~~~~~~~~~~

The code in this tutorial touches some aspects of the coweb framework, but not all of them. You can continue to learn about the available APIs by extending the shopping list application. The following are some suggestions about what you might attempt next.

* Add a list of users in the session.
* Add a text chat widget.
* Improve the display of remote user focus in the grid (e.g., include usernames, highlight specific cells, distinguish row focus from cell edit).
* Persist shopping list changes for the next time a user enters the session.
* Connect the shopping list to an external service for online orders.
* Add a session status status indicator. (The complete example uses a Dojo-based busy dialog available in the http://github.com/opencoweb/cowebx repository.)
