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

db_mem = dataset.connect(settings.CONNECTION_STRING)
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
        

table = db_lts[settings.TABLE_NAME]
memory = db_mem[settings.TABLE_NAME]        
#convert twitter string to python datetime class
def conv_twitter_date(twitter_date_string):
    d = datetime.strptime(twitter_date_string,'%a %b %d %H:%M:%S +0000 %Y').replace(tzinfo=pytz.UTC)
    return d

class StreamListener(tweepy.StreamListener):

    def on_status(self, status):
        if status.retweeted:
            return
        store_tweet(status,db_mem)
        store_tweet(status,db_lts)

    def on_error(self, status_code):
        if status_code == 420:
            #returning False in on_data disconnects the stream
            return False
    



stream_listener = StreamListener()
stream = tweepy.Stream(auth=api.auth, listener=stream_listener)
stream.filter(track=settings.TRACK_TERMS)

        
#functions to run during weekly mung of database
def extract_hashtags(entities):
    hashtags = []
    entities = json.loads(entities)
    if entities['hashtags']:
        for hashtag in entities['hashtags']:
            hashtags.append(hashtag.text)
    return hashtags        

def extract_urls(entities):   
    urls = []
    entities = json.loads(entities)
    if entities['urls']:
        for url in entities['hashtags']:
            urls.append(url.display_url)
    return urls 
    
def frequencies(dataframe):
    #create list of all entities
    
  # extract hashtags from text except ones we are gathering on
    hashtags = []
    urls = []
    remove_hashtags = [s.strip('#') for s in settings.TRACK_TERMS]
    for entity in dataframe['entities']:
        hashtag_list = extract_hashtags(entity)
        hashtag_list = [i for i in hashtag_list if i not in remove_hashtags]
        url_list = extract_urls(entity)
        hashtags += hashtag_list
        urls += url_list
    hashtag_freqs = pd.value_counts(hashtags).to_frame().reset_index()
    hashtag_freqs.columns = ["labels","counts"]
    url_freqs =  pd.value_counts(urls).to_frame().reset_index()
    url_freqs.columns = ["labels","counts"]
    
    return url_freqs, hashtag_freqs
    
    
 
    
    
    
    
    
def weekly_mung():    
 #   df = pd.DataFrame(data=db_mem.all(),index=None)
    chart_dict = {} 
    df = pd.read_csv("fakedata.csv")
    #convert datetimes 
    df['user_created'] = pd.to_datetime(df['user_created'],format='%a %b %d %H:%M:%S +0000 %Y')
    df['created'] = pd.to_datetime(df['created'],format='%a %b %d %H:%M:%S +0000 %Y')
    df.set_index(['created'],inplace=True)
    #split between this week and last
    now = pd.to_datetime('now')
    df_this_week = df.ix[now:now - DateOffset(weeks=1)]
    df_last_week = df.ix[now - DateOffset(weeks=1):now - DateOffset(weeks=2)]
    
    this_week_urls, this_week_hashtags = frequencies 
    


    
    
    
    
                    

    
    
  
    
weekly_mung()

    
schedule.every(5).minutes.do(weekly_mung)

while 1:
    schedule.run_pending()
    

