#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Tue Oct  3 17:45:05 2017

@author: ds
"""

import settings
import tweepy
import schedule
from boto.s3.connection import S3Connection
from textblob import TextBlob
import dataset
import pandas as pd
import logging

#setting up logging

logging.basicConfig(filename='history.log', filemode='w',level=logging.DEBUG)

#set up boto connection access
conn = S3Connection('AKIAJT4LO3PGSBFXOHNA','fbNR2gQdePUof9JJw13OdRbNkAgm+TcweMnUPp7y')
bucket = conn.get_bucket('wh-twitter')

db_mem = dataset.connect(settings.CONNECTION_STRING)
db_lts = dataset.connect(settings.CONNECTION_STRING_LTS)

class StreamListener(tweepy.StreamListener):

    def on_status(self, status):
        if status.retweeted:
            return

        text = status.text
        print(text)
        name = status.user.screen_name
        user_created = status.user.created_at
        followers = status.user.followers_count
        id_str = status.id_str
        created = status.created_at
        retweets = status.retweet_count
        blob = TextBlob(text)
        sent = blob.sentiment
        table = db_lts[settings.TABLE_NAME]
        memory = db_mem[settings.TABLE_NAME]
        try:
            table.insert(dict(
                text=text,
                user_name=name,
                user_created=user_created,
                user_followers=followers,
                id_str=id_str,
                created=created,
                retweet_count=retweets,
                polarity=sent.polarity,
                subjectivity=sent.subjectivity,
            ))
        except Exception as exc:
            print("mem insert error: " + str(type(exc)))
        
        try: memory.insert(dict(
                text=text,
                user_name=name,
                user_created=user_created,
                user_followers=followers,
                id_str=id_str,
                created=created,
                retweet_count=retweets,
                polarity=sent.polarity,
                subjectivity=sent.subjectivity,
            ))
        except Exception as exc:
            print("lts insert error: " + str(type(exc)))
        
    def on_error(self, status_code):
        if status_code == 420:
            #returning False in on_data disconnects the stream
            return False
    
auth = tweepy.OAuthHandler(settings.CONSUMER_KEY, settings.CONSUMER_SECRET)
auth.set_access_token(settings.ACCESS_TOKEN, settings.ACCESS_TOKEN_SECRET)
api = tweepy.API(auth)


stream_listener = StreamListener()
stream = tweepy.Stream(auth=api.auth, listener=stream_listener)
stream.filter(track=settings.TRACK_TERMS)

def weekly_mung():
    df = pd.DataFrame(data=db_mem.all(),index=None)
    
    
      


    
schedule.every(5).minutes.do(weekly_mung)

while 1:
    schedule.run_pending()
    

