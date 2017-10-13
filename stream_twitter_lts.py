# -*- coding: utf-8 -*-
"""
Created on Tue Oct  3 17:45:05 2017

@author: ds
"""

import settings
import tweepy
from textblob import TextBlob
import dataset
import logging
import json
import private_keys

#auth twitter
api = tweepy.API(auth_handler=private_keys.auth, wait_on_rate_limit=True,wait_on_rate_limit_notify=True)

#setting up logging
#logging.basicConfig(filename='history.log', filemode='w',level=logging.DEBUG)

 # create logger with 'lts'
logger = logging.getLogger('twitter_lts')
logger.setLevel(logging.DEBUG)
 # create console handler with a higher log level
ch = logging.StreamHandler()
ch.setLevel(logging.ERROR)
 # create file handler which logs even debug messages
fh = logging.FileHandler('spam.log',mode='w')
fh.setLevel(logging.DEBUG)
 # create formatter and add it to the handlers
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
fh.setFormatter(formatter)
ch.setFormatter(formatter)
# add the handlers to the logger
logger.addHandler(fh)
logger.addHandler(ch)

db_lts = dataset.connect(settings.CONNECTION_STRING_LTS)

def store_tweet(tweet,database):
        text = tweet.text
        print(text)
        name = tweet.user.screen_name
        user_created = tweet.user.created_at
        followers = tweet.user.followers_count
        id_str = tweet.id_str
        created = tweet.created_at
        retweets = tweet.retweet_count
        blob = TextBlob(text)
        sent = blob.sentiment
        entities_json = json.dumps(tweet.entities)
        
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
            print(str(database) + " insert error: " + str(type(exc)))
            

lts = db_lts[settings.TABLE_NAME]     

class StreamListener(tweepy.StreamListener):

    def on_status(self, status):
        if status.retweeted:
            return
        store_tweet(status,lts)
        logger.info('tweet object inserted')

    def on_error(self, status_code):
        if status_code == 420:
            #returning False in on_data disconnects the stream
            logger.error('on_error: ' + str(status_code))
            return False


stream_listener = StreamListener()
stream = tweepy.Stream(auth=api.auth, listener=stream_listener)
stream.filter(track=settings.TRACK_TERMS)
    
    
    
                

    
    
  


