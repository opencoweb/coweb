'''
Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
'''
import sys
import cgitb

cgitb.enable()
body = sys.stdin.read()
print 'Content-Type: application/json'
print
print body
