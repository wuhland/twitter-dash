# -*- coding: utf-8 -*-
"""
Created on Tue Oct  3 17:45:05 2017

@author: ds
"""

import settings
from textblob import TextBlob
import dataset
import logging
import json
import private_keys
from private_keys import TwitterStreamCreds
import time
from datetime import datetime
from socket import error as SocketError
import errno

#setting up logging
#logging.basicConfig(filename='history.log', filemode='w',level=logging.DEBUG)

 # create logger with 'lts'
logger = logging.getLogger('twitter_lts')
logger.setLevel(logging.INFO)
 # create console handler with a higher log level
ch = logging.StreamHandler()
ch.setLevel(logging.ERROR)
 # create file handler which logs even debug messages
fh = logging.FileHandler('history.log',mode='w')
fh.setLevel(logging.INFO)
 # create formatter and add it to the handlers
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
fh.setFormatter(formatter)
ch.setFormatter(formatter)
# add the handlers to the logger
logger.addHandler(fh)
logger.addHandler(ch)

db_lts = dataset.connect(settings.CONNECTION_STRING_LTS)
lts = db_lts[settings.TABLE_NAME]  

def store_tweet(tweet,database):
        text = tweet["text"]
        name = tweet["user"]["screen_name"]
        user_created = datetime.strptime(tweet["user"]["created_at"],'%a %b %d %H:%M:%S +0000 %Y')
        followers = tweet["user"]["followers_count"]
        id_str = tweet["id_str"]
        created = datetime.strptime(tweet["created_at"],'%a %b %d %H:%M:%S +0000 %Y')
        retweets = tweet["retweet_count"]
        blob = TextBlob(text)
        sent = blob.sentiment
        entities_json = json.dumps(tweet["entities"])
       	logger.info(name + " | " + text) 
        try: database.insert(dict(
                text=text,
                user_name=name,
                user_created=user_created,
                user_followers=followers,
                id_str=id_str,
                created=created,
                retweet_count=retweets,
                polarity=sent.polarity,
                subjectivity=sent.subjectivity,
                entities = entities_json
            ))
        except Exception as exc:
            logger.error(" insert error: " + str(exc))
            
        

   

class MyStreamer(TwitterStreamCreds):

    def on_success(self, data):
        print(data['text'])
        if data['retweeted']:
            return
        if hasattr(data,'retweeted_status'):
            data['entities'] = data['retweeted_status']['entities']
            data['text'] = data['retweeted_status']['text']
        store_tweet(data,lts)
        logger.info('tweet object inserted')

    def on_error(self, status_code, data):
        if status_code == 420:
            #returning False in on_data disconnects the stream
            logger.error('rate limited')
            time.sleep(60 * 15)
            
            
    
#grab list of keywords or just the one keyword
def grab_tracks(tracklist):
    if len(tracklist) > 1:
        string = ', '.join(tracklist)
    else:
        string = tracklist[0]
    return string

#trying to handle connection disconnect error
try:
    stream_listener = MyStreamer()
    stream_listener.statuses.filter(track=grab_tracks(settings.TRACK_TERMS))
except SocketError as e:
    if e.errno != errno.ECONNRESET:
        raise
    pass    
    
        


    
  


