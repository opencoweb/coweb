<?php
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
//
$handle = fopen('php://input','r');
$jsonInput = fgets($handle);
fclose($handle);
echo $jsonInput;
?>