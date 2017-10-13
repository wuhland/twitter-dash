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
import json
import private_keys
from pandas.tseries.offsets import DateOffset
import igraph as ig
import itertools


#auth twitter
api = tweepy.API(auth_handler=private_keys.auth, wait_on_rate_limit=True,wait_on_rate_limit_notify=True)

#set up boto connection access
conn = private_keys.conn
bucket = conn.get_bucket('wh-twitter')

#setting up logging
logging.basicConfig(filename='history.log', filemode='w',level=logging.DEBUG)

db_lts = dataset.connect(settings.CONNECTION_STRING_LTS)
db_mem = dataset.connect(settings.CONNECTION_STRING)

def store_tweet(tweet,database):
        text = tweet.text
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
memory = db_mem[settings.TABLE_NAME]        

class StreamListener(tweepy.StreamListener):

    def on_status(self, status):
        if status.retweeted:
            return
        store_tweet(status,memory)
        store_tweet(status,lts)

    def on_error(self, status_code):
        if status_code == 420:
            
            #returning False in on_data disconnects the stream
            return False
    def on_disconnect(self, notice):
        return
    



stream_listener = StreamListener()
stream = tweepy.Stream(auth=api.auth, listener=stream_listener)
stream.filter(track=settings.TRACK_TERMS)

        
#functions to run during weekly mung of database
def extract_entities(entities):
    hashtags = []
    urls = []
    entities = json.loads(entities)
    if entities['hashtags']:
        for hashtag in entities['hashtags']:
            hashtags.append(hashtag['text'])
    if entities['urls']:
        for url in entities['urls']:
            if 'display_url' in url.keys():
                display_url = url['display_url']
                #do not include if it is a twitter share
                if not display_url.startswith("twitter"):
                    urls.append(display_url)
               
    return hashtags, urls        

    
def frequencies(dataframe):
    #create list of all entities
    
  # extract hashtags from text except ones we are gathering on
    hashtags = []
    urls = []
    remove_hashtags = [s.strip('#') for s in settings.TRACK_TERMS]
                               
    for entity in dataframe['entities']:
        hashtag_list, url_list = extract_entities(entity)
        hashtag_list = [i for i in hashtag_list if i.lower() not in remove_hashtags]
        if hashtag_list:
            hashtags += hashtag_list
        if url_list:
            urls += url_list
    hashtag_freqs = pd.value_counts(hashtags).to_frame().reset_index()
    hashtag_freqs.columns = ["labels","counts"]
    url_freqs =  pd.value_counts(urls).to_frame().reset_index()
    url_freqs.columns = ["labels","counts"]
    
    return url_freqs, hashtag_freqs
    
    
 
    
    
#function takes two df of frequencies and compares the difference, returns on df with percentage change

def trending(df1, df2, merge_on):
    concat = pd.merge(df1,df2,on=merge_on,how='outer')
    concat.fillna(0)
    concat.columns = ['labels','last_week','this_week']
  #  concat['this_week'] = np.random.randn(11,1) + 3
    concat['pct_change'] = (concat['this_week'] - concat['last_week'])/concat['last_week'] 
    return(concat.sort_values(by=['pct_change'],ascending=False))
    
#create media list: gets a list of lists of media sources found in twitter
#outputs an igraph network dataset    
def make_media_graph(media_list):
    g = ig.Graph(directed=False)
    for lst in media_list:
        #remove repeated items from list
        lst = list(set(lst))   
        if lst and len(lst) >= 2:
            # check to see if vertecy is in graph and if not add
            for item in lst:
                try: 
                    g.vs.find(name=item)
                except:
                    g.add_vertices(item)
            combos = itertools.combinations(lst,2)
     #       print(list(combos))
            for combo in combos:
                g.add_edge(source = combo[0],target=combo[1])
    return g        
            
    
def weekly_mung():

    chart_data = {}    
 #   df = pd.DataFrame(data=db_mem.all(),index=None)
    df = pd.DataFrame(columns=lts.columns)
   # df = pd.read_csv("fakedata.csv")

    for tweet in lts:
        created = pd.to_datetime(tweet['created'],format='%a %b %d %H:%M:%S +0000 %Y')
        for key in tweet.keys():       
            df.loc[created,key] = tweet[key]
            
        
    
    #convert datetimes 
    df['user_created'] = pd.to_datetime(df['user_created'],format='%a %b %d %H:%M:%S +0000 %Y')
    df['created'] = pd.to_datetime(df['created'],format='%a %b %d %H:%M:%S +0000 %Y')

    #split between this week and last
    now = pd.to_datetime('now')
    
    week = DateOffset(weeks=1)    
    one_week_ago = now - week
    two_weeks_ago = now - (week * 2)
    #last week
    mask1 = (df['created'] < now) & (df['created'] >= one_week_ago)
    df_this_week = df.loc[mask1]
    #two weeks ago
    mask2 = (df['created'] < one_week_ago) & (df['created'] >= two_weeks_ago)
    #temporarily leave mask 1 in so there is data populated for testing
    df_last_week = df.loc[mask1]
    this_week_urls, this_week_hashtags = frequencies(df_this_week)
    last_week_urls, last_week_hashtags = frequencies(df_last_week)
    trending_hashtags = trending(this_week_hashtags,last_week_hashtags,'labels')
    trending_urls = trending(this_week_urls,last_week_urls,'labels')
    
    chart_data['top_hashtags'] = {'x':list(this_week_hashtags.head()['labels']),
              'y':list(this_week_hashtags.head()['counts']
              )}
    chart_data['top_urls'] = {'x':list(this_week_urls.head()['labels']),
              'y':list(this_week_urls.head()['counts']
              )}
    chart_data['trending_hashtags'] = {'x':list(trending_hashtags.head()['labels']),
              'y':list(trending_hashtags.head()['pct_change']
              )} 
    chart_data['trending_urls'] = {'x':list(trending_urls.head()['labels']),
              'y':list(trending_urls.head()['pct_change']
              )}
    
    
    #function to parse entities and return list of tlds shared 
    def user_urls(grouped_entities):

        url_list = []
        for x in grouped_entities: 
            _ , urls = extract_entities(x)
            url_list += [x.split('/')[0] for x in urls]
        return url_list
            
     #grouped dataframe with list of urls shared by each tweeter   
    media_df = df.groupby(by=['user_name'])['entities'].apply(list).apply(user_urls)
    
    #make graph
    graph = make_media_graph(list(media_df))
    #apply fr layout in 3d to get coordinates
    layout = graph.layout_fruchterman_reingold_3d()
    
    #append 3d layout to chart data
    
    #takes graph object and returns dict in format suitable for plotly.js
    def make_plotly_graph(g, layout):
        return {
                "x":[coord[0] for coord in layout.coords],
                "y":[coord[1] for coord in layout.coords],
                "z":[coord[2] for coord in layout.coords],
                "text":[node["name"] for node in g.vs],
                "marker":g.degree()
                }
    
    chart_data['media_graph'] = make_plotly_graph(graph, layout)   

    #delete older records from memory
    del_query_str = "DELETE FROM " + settings.TABLE_NAME + " WHERE created <= " + str((now - (week * 2)).strftime("%Y-%m-%d"))      
    db_mem.query(del_query_str)    
    
    
  
    
weekly_mung()

    
schedule.every(1).week.do(weekly_mung)

while 1:
    schedule.run_pending()
    

