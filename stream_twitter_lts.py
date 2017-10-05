#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Tue Oct  3 17:45:05 2017

@author: ds
"""

import settings
import tweepy
from boto.s3.connection import S3Connection
from textblob import TextBlob
import dataset
import logging
import datetime
import pytz
import json
import private_keys

#auth twitter

api = tweepy.API(private_keys.auth)

#set up boto connection access
conn = private_keys.conn
bucket = conn.get_bucket('wh-twitter')

#setting up logging
logging.basicConfig(filename='history.log', filemode='w',level=logging.DEBUG)
logger = logging.getLogger('log')
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
            
            logger.error(str(database) + " insert error: " + str(type(exc)))
        

table_lts = db_lts[settings.TABLE_NAME]
#convert twitter string to python datetime class
def conv_twitter_date(twitter_date_string):
    d = datetime.strptime(twitter_date_string,'%a %b %d %H:%M:%S +0000 %Y').replace(tzinfo=pytz.UTC)
    return d

class StreamListener(tweepy.StreamListener):

    def on_status(self, status):
        if status.retweeted:
            return
        store_tweet(status,table_lts)

    def on_error(self, status_code):
        if status_code == 420:
            #returning False in on_data disconnects the stream
            logger.error('twitter API time out stream disconnected')
            return False
    



stream_listener = StreamListener()
stream = tweepy.Stream(auth=api.auth, listener=stream_listener)
stream.filter(track=settings.TRACK_TERMS)

 
    
    
    
    
                    

    
    
  


