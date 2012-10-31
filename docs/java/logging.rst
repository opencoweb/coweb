.. reviewed 0.4
.. include:: /replace.rst
.. default-domain:: py

Logging in the Java Server
--------------------------

Coweb applications using the Java server should be aware that the server uses
`Java's logging utility
<http://docs.oracle.com/javase/1.4.2/docs/guide/util/logging/overview.html>`__.
To see the logging output, you will need to configure your application to use an
appropriate logging device.

Printing to console
~~~~~~~~~~~~~~~~~~~

The cowebx demo applications use the `Simple Logging Facade for Java
<http://www.slf4j.org/>`__. To use this utility to print to standard out,
add the following to the dependencies section in your application's pom.xml
file.

   .. sourcecode:: xml
   
        <dependency>
            <groupId>org.slf4j</groupId>
            <artifactId>slf4j-api</artifactId>
            <version>1.6.1</version>
        </dependency>
        <dependency>
            <groupId>org.slf4j</groupId>
            <artifactId>slf4j-simple</artifactId>
            <version>1.6.1</version>
        </dependency>

