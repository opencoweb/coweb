'''
Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''
# std lib
import logging
# coweb
from base import BayeuxExtBase

log = logging.getLogger('bayeux.server')

class BayeuxAuthExt(BayeuxExtBase):
    '''
    Bayeux extension to support in-band auth with delegation to a handler 
    callback.
    '''
    def on_handshake(self, cl, conn, req, res):
        reqauth = None
        ext = req.get('ext')
        if ext:
            reqauth = ext.get('authentication')
        try:
            success = conn.on_auth_ext(cl, reqauth)
        except Exception:
            log.exception('auth handler')
            success = False
        # include auth result
        ext = res.setdefault('ext', {})
        resauth = ext.setdefault('authentication', {})
        resauth['failed'] = not success
        if not success:
            res['successful'] = False
            res['error'] = '401::authentication failed'
            res['advice']['reconnect'] = 'none'