'''
Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
'''

def getServiceNameFromChannel(channel, pub):
    # Public channels are of form /bot/<NAME>
    # Private channels are of form /service/bot/<NAME>/(request|response)
    parts = channel.split("/")
    if pub:
        if 3 == len(parts):
            return parts[2]
    else:
        if 5 == len(parts) and \
                ("request" == parts[4] or "response" == parts[4]):
            return parts[3];
    return ""

def isServiceChannel(channel):
    return channel.startswith("/service/bot") or channel.startswith("/bot")

def isPublicBroadcast(channel):
    return not channel.startswith("/service")

