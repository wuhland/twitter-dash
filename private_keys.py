#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Thu Oct  5 20:41:33 2017

@author: ds
"""
from twython import TwythonStreamer
from boto.s3.connection import S3Connection

AWS_ACCESS_KEY_ID = 'AKIAJT4LO3PGSBFXOHNA'
AWS_SECRET_ACCESS_KEY ='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'
CONSUMER_KEY = 'bN7VSMVUwMhImQ8kzLie1It4J'
CONSUMER_SECRET = 'X11EV8SAym7aIjuNXv6ojLuXsa7KTjfsJp4gWfxQUCb6FI11Rc'
ACCESS_TOKEN = '28627512-soEZFN7GHU5liLyC8RqL7CipuiEBb0gBZxUpwbcyk'
ACCESS_TOKEN_SECRET = 'IeFjq3ycaD7hoLiegbVeeIJXM3yqjkrDaxPxdnmAOHUNX'

conn = S3Connection(AWS_ACCESS_KEY_ID,AWS_SECRET_ACCESS_KEY)
class TwitterStreamCreds(TwythonStreamer):
    def __init__(self):
        super().__init__(CONSUMER_KEY,CONSUMER_SECRET,ACCESS_TOKEN,ACCESS_TOKEN_SECRET)



