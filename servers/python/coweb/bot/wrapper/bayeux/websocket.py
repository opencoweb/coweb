'''
Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
# std lib
import os
import uuid
import logging
import random
import asynchat
import asyncore
import urlparse
import struct
import socket
import hashlib

log = logging.getLogger('websocket.client')

# max defined by spec
MAXINT = 4294967295
# schemes defined by spec
SCHEMES = ['ws', 'wss']

# make urlparse websocket protocol aware
urlparse.uses_netloc.extend(SCHEMES)
urlparse.uses_query.extend(SCHEMES)
urlparse.uses_fragment.extend(SCHEMES)

class WebSocketURL(object):
    '''Represents parts of a WebSocket URL.'''
    def __init__(self, host, port, resource, secure):
        self.host = host
        self.port = port
        self.resource = resource
        self.secure = secure

    def __str__(self):
        url = 'wss' if self.secure else 'ws'
        url += '://' + self.host
        if (not self.secure and self.port != 80) or \
        (self.secure and self.port != 443):
            url += ':' + str(self.port)
        return url + self.resource

class WebSocketClient(asynchat.async_chat):
    '''Asynchat-based bot wrapper talking Bayeux over WebSocket.'''
    def __init__(self, uri):
        asynchat.async_chat.__init__(self) 
        # validate the uri
        self._url = self._validate_uri(uri)
        # response header fields
        self._fields = {}
        # origin for later comparison
        self._origin = socket.gethostname()

        # current state
        self._handler = self._on_request_line
        
        # start by listening for header response
        self.set_terminator('\x0a')
        # connect to server
        self._inBuffer = []
        self.create_socket(socket.AF_INET, socket.SOCK_STREAM) 
        addr = (self._url.host, self._url.port)
        self.connect(addr)
        
    def _validate_uri(self, uri):
        '''Parse and validate the connection URL.'''
        uri = urlparse.urlparse(uri)

        # 3.1 3: validate scheme
        if uri.scheme not in SCHEMES:
            raise ValueError('invalid uri scheme')
        # 3.1 4: validate no fragment
        if uri.fragment:
            raise ValueError('fragment not allowed')
        # 3.1 5: determine secure
        secure = (uri.scheme == 'wss')
        # 3.1 6: lowercase host
        host = uri.netloc.lower()
        # 3.1 7-8: default ports
        args = uri.netloc.split(':')
        if len(args) == 1:
            port = 80 if secure else 443
        else:
            host = args[0]
            port = int(args[1])
        # 3.1 9-10: resource name
        resource = uri.path or '/'
        # 3.1 11: append query
        if uri.query:
            resource += '?' + uri.query

        # build web socket url object
        return WebSocketURL(host, port, resource, secure)
        
    def handle_close(self):
        '''Called when the server closes the connection.'''
        self.close()
        try:
            self.on_ws_close()
        except Exception:
            logging.exception('on_ws_close')

    def handle_connect(self):
        '''Called when the client connects to the server.'''
        # @todo: 4.1 4: tls handshake if secure
        # 4.1 5: GET request
        self.push('GET %s HTTP/1.1\r\n' % self._url.resource.encode('utf-8'))
        # 4.1 6: fields
        fields = []
        # 4.1 7: upgrade header
        fields.append('Upgrade: WebSocket')
        # 4.1 8: connection header
        fields.append('Connection: Upgrade')
        # 4.1 9-10: build host plus port
        hostport = self._url.host.lower()
        # 4.1 11: append non-default port
        if (not self._url.secure and self._url.port != 80) or \
        (self._url.secure and self._url.port != 443):
            hostport += ':' + str(self._url.port)
        # 4.1 12: host header
        fields.append('Host: ' + hostport)
        # 4.1 13: origin header
        fields.append('Origin: '+self._origin)
        # @todo: 4.1 14: Sec-WebSocket-Protocol header
        # @todo: 4.1 15: cookies
        # 4.1 16-22: key gen
        self._number1, key1 = self._build_key()
        self._number2, key2 = self._build_key()
        # 4.1 23: add keys to header
        fields.append('Sec-WebSocket-Key1: '+key1)
        fields.append('Sec-WebSocket-Key2: '+key2)
        # 4.1 24: send headers in random order
        random.shuffle(fields)
        self.push('\r\n'.join(fields).encode('utf-8'))
        # 4.1 25: send header terminator
        self.push('\r\n\r\n')
        # 4.1 26: random 64-bit int in big endian
        key3 = random.randint(0, 2**64)
        key3 = struct.pack('>Q', key3)
        # 4.1 27: send key3
        self.push(key3)
        self._key3 = key3

    def _build_key(self):
        '''Produces one of the Sec-WebSocket-Key* header values.'''
        # 4.1 16: spaces
        spaces = random.randint(1, 12)
        # 4.1 17: max integers
        maxI = int(MAXINT / spaces)
        # 4.1 18: numbers
        number = random.randint(0, maxI)
        # 4.1 19: products
        product = number * spaces
        # 4.1 20: string of products; but make a list for next step
        key = list(str(product))
        # 4.1 21: random char interpolation
        chars = range(0x0021, 0x0030) + range(0x003A, 0x007F)
        for x in xrange(random.randint(1, 12)):
            i = random.randint(0, len(key))
            c = random.choice(chars)
            key.insert(i, chr(c))
        # 4.1 22: random space interpolation
        for x in xrange(spaces):
            i = random.randint(1, len(key)-1)
            key.insert(i, ' ')
        return number, ''.join(key)

    def collect_incoming_data(self, data):
        '''Called when data is received.'''
        self._inBuffer.append(data)
        
    def found_terminator(self):
        '''Called when a complete "chunk" is received.'''
        self._handler(''.join(self._inBuffer))
        self._inBuffer = []
        
    def _on_request_line(self, field):
        '''Called to handle the request line from the server.'''
        # 4.1 28: validate field with terminator
        field += '\x0a'
        if len(field) < 7 or field[-2:] != '\r\n' or field.count(' ') < 2:
            # abort connect
            self.close()
            raise ValueError('invalid request line')
        # 4.1 29: get code
        start = field.find(' ')
        end = field.find(' ', start+1)
        code = field[start+1:end]
        # 4.1 30: validate code
        # 4.1 31: abort if not 101
        # @todo: maybe handle 407 one day for proxy auth
        # @todo: check for bytes in range 0x30 to 0x39
        if code != '101':
            self.close()
            raise ValueError('response code: ' + code)

        # process header fields next
        self._handler = self._on_header_field
        # read a header field
        self.set_terminator('\r\n')
        
    def _on_header_field(self, field):
        '''Called to handle a header line from the server.'''
        # 4.1 34-40: process headers, watching for malformed with \n
        if not field:
            # skip to processing headers
            self._on_process_fields()
            return
        # make sure no stray \r or \n
        if field.find('\r') > -1 or field.find('\n') > -1:
            # abort, invalid header
            self.close()
            raise ValueError('invalid header: ' + field)
        # store field, let exceptions disconnect us
        # @todo: have to close on exception?
        name, value = field.split(':', 1)
        name = name.strip().lower()
        value = value.strip()
        # store field for later processing
        # @todo: this takes last name encountered if dupes, spec says allow
        #   one and only one
        self._fields[name] = value

    def _on_process_fields(self):
        '''Called to process received header fields.'''
        # 4.1 41: check required fields
        required = {
            'upgrade' : 'WebSocket',
            'connection' : 'upgrade',
            'sec-websocket-origin' : self._origin,
            'sec-websocket-location' : str(self._url)}
        # @todo: add sec-websocket-protocol header if protocol was set
        # @todo: handle cookies?
        for rname, rvalue in required.iteritems():
            try:
                value = self._fields[rname]
            except KeyError:
                # missing required
                self.close()
                raise ValueError('missing required header: ' + rname)
            # connection to be compared in lower case, oi
            if rname == 'connection':
                value = value.lower()
            if value != rvalue:
                # wrong value
                self.close()
                raise ValueError('wrong header value: ' + value)
        # 4.1 44: read sixteen bytes from body
        self._handler = self._on_challenge_reply
        self.set_terminator(16)
    
    def _on_challenge_reply(self, reply):
        '''Called to check the key challenge response from the server.'''
        # 4.1 42-43: compute expected response to challenge
        # @todo: supposed to check in order sent, but that's tough on server
        # side where headers are pre-parsed, just check 1,2,3
        expected = struct.pack('>II', self._number1, self._number2) + self._key3
        expected = hashlib.md5(expected)
        # 4.1 45: compare reply and expected
        if expected.digest() != reply:
            self.close()
            raise ValueError('challenge response incorrect')
        # 4.1 46: yay! established websocket
        self._handler = self._on_start_frame
        self.set_terminator(1)
        
        # invoke bot websocket open method
        try:
            self.on_ws_open()
        except Exception:
            logging.exception('on_ws_open')
        
    def _on_start_frame(self, byte):
        '''Called when receiving the start of a frame.'''
        if ord(byte) & 0x80 == 0x80:
            # @todo: support length type frames
            self.close()
            return
        # look for end of frame
        self._handler = self._on_end_frame
        self.set_terminator('\xff')

    def _on_end_frame(self, data):
        '''Called when receiving the end of a frame.'''
        try:
            self.on_ws_message(data.decode('utf-8'))
        except Exception:
            logging.exception('on_ws_message')
        # look for start of next frame
        self._handler = self._on_start_frame
        self.set_terminator(1)
        
    def send_ws(self, data):
        '''Sends data as a websocket frame.'''
        if isinstance(data, dict):
            message = json.dumps(data)
        if isinstance(data, unicode):
            message = data.encode('utf-8')
        assert isinstance(data, str)
        self.push('\x00' + data + '\xff')

    def on_ws_open(self):
        '''Callback for WebSocket open.'''
        pass
    
    def on_ws_message(self, data):
        '''Callback for WebSocket message.'''
        pass
    
    def on_ws_close(self):
        '''Callback for WebSocket close.'''
        pass