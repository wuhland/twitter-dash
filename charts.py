#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Tue Oct  3 17:45:05 2017

@author: ds
"""

import settings
from datetime import datetime
import schedule
import boto3
from textblob import TextBlob
import dataset
import pandas as pd
import logging
import json
from pandas.tseries.offsets import DateOffset
import igraph as ig
import itertools
from private_keys import TwitterStreamCreds
import time
import numpy
import re

haters = []
with open("wh_alt_media.txt","r") as fileIn:
    haters = fileIn.read().splitlines()

#instantiates boto object
s3 = boto3.resource('s3')
obj = s3.Object('wh-twitter','charts.json')
obj_acl = obj.Acl()


#encodes numpy types as python for exporting chart data
class MyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, numpy.integer):
            return int(obj)
        elif isinstance(obj, numpy.floating):
            return float(obj.round(3))
        elif isinstance(obj, numpy.ndarray):
            obj = numpy.around(obj,decimals=3)
            return obj.tolist()
        else:
            return super(MyEncoder, self).default(obj)
#setting up logging

 # create logger with 'lts'
logger = logging.getLogger('boto3')
logger.setLevel(logging.INFO)
 # create console handler with a higher log level
ch = logging.StreamHandler()
ch.setLevel(logging.ERROR)
 # create file handler which logs even debug messages
fh = logging.FileHandler('charts.log',mode='w')
fh.setLevel(logging.INFO)
 # create formatter and add it to the handlers
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
fh.setFormatter(formatter)
ch.setFormatter(formatter)
# add the handlers to the logger
logger.addHandler(fh)
#logger.addHandler(ch)

db_lts = dataset.connect(settings.CONNECTION_STRING_LTS)

lts = db_lts[settings.TABLE_NAME]

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


def make_entity_dfs(dataframe):
    print("in make_entity_dfs")

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
            url_list = [x.split('/')[0] for x in url_list]
            urls += url_list
    hashtag_freqs = make_freq_df(hashtags)
    url_freqs = make_freq_df(urls)
    return url_freqs, hashtag_freqs

def make_freq_df(lst):
    freq_df = pd.value_counts(lst).to_frame().reset_index()
    freq_df.columns = ["labels","values"]
    return freq_df

def data_from_freq_df(frequency_df):
    frequency_df = frequency_df.head(10)
    return {'labels':list(frequency_df['labels']),
                          'values':list(frequency_df['values'])
                          }
#TODO remove *... from list 
def list_from_lists(lists,remove_list):
    items = []
    for lst in lists:
        lst = [i for i in lst if i not in remove_list]
        items += lst
    return items

#function takes two df of frequencies and compares the difference, returns on df with percentage change

def trending(df1, df2, merge_on):

    concat = pd.merge(df1,df2,on=merge_on,how='left')

    concat = concat.fillna(0)

    concat.columns = ['labels','last_week','this_week']
    concat['values'] =  ((concat['this_week'] - concat['last_week'])/concat['last_week']) * 100

    concat['values'] = concat['values'].astype(int)

    return(concat.sort_values(by=['values'],ascending=False))

#create media list: gets a list of lists of media sources found in twitter
#outputs an igraph network dataset
def make_media_graph(media_list, remove_list= None, combine_list = None):
    print("in make_media_graph")

    g = ig.Graph(directed=False)
    for lst in media_list:
        if combine_list:
            for clist in combine_list:
                #I hope this works, this is to combine url concatinators and such
                lst = [clist[0] if item in clist else item for item in lst]
            
        #remove repeated items from list
        lst = list(set(lst))
        if remove_list:
            lst = [item for item in lst if item not in remove_list]
        if lst and len(lst) >= 2:
            # check to see if vertecy is in graph and if not add
            for item in lst:
                try:
                    g.vs.find(name=item)
                except:
                    g.add_vertices(item)
            combos = itertools.combinations(lst,2)
            for combo in combos:
                g.add_edge(source = combo[0],target=combo[1])
    return g

def make_graph_data(graph):
    print("in make_graph_data")

    data = {"links":[],"nodes":[]}
    degree_list = graph.degree()
    for e in graph.get_edgelist():
        data["links"].append({"source":e[0],"target":e[1]})
    for n in graph.vs:
        group = "media"
        if n["name"] in haters:
            group = "alt"            
        data["nodes"].append({"id":n.index,"name":n["name"],"group":group,"degree":degree_list[n.index]})
    return data    
     
#def make_graph_edges(graph, layout):
#    component_traces = {}
#    node_coords = layout.coords
#    n = 0
#    adjlists = graph.get_adjlist(mode='OUT')
#    for adjlist in adjlists:
#        x,y,z = [],[],[]
#        newlist = []
#        for i in adjlist:
#           newlist += [i] + [n]
#           print(newlist)
#        adjlist = newlist
#        component_coords = [node_coords[node] for node in adjlist]
#        n += 1
#        for coords in component_coords:
#            x.append(round(coords[0],2))
#            y.append(round(coords[1],2))
#            z.append(round(coords[2],2))
#        component_traces["trace" + str(n + 1)] = {'x':x,'y':y,'z':z}
#    return component_traces

def add_sentiment_lab(df):
    def label_polarity(num):
        polarity = ""
        if(num < 0):
            polarity = "negative"
        elif (num > 0):
            polarity = "positive"
        else:
            polarity = "neutral"
        return polarity
    df["sentiment_lab"] = df["polarity"].map(label_polarity)
    return df

def make_frequency_data(lst,lab_replacements = None):
     #generate sentiment props
    frequency_df = pd.value_counts(lst).to_frame().reset_index()
    frequency_df.columns = ["labels","values"]
    # if replacements replace
    if lab_replacements is not None:
        if frequency_df["labels"].dtype == numpy.int64:
            frequency_df.sort_values('labels',inplace=True, ascending=True)
        frequency_df.replace(to_replace = lab_replacements,inplace=True)       
    return data_from_freq_df(frequency_df)

#rotates layout 90d along x axis if taller than wide: takes layout, returns layout
#def graph_along_min_dim(layout):
#    boundaries = layout.boundaries()
#    xdiff = boundaries[1][0] - boundaries[0][0]
#    ydiff = boundaries[1][1] - boundaries[0][1]
#    if ydiff > xdiff:
#        layout.rotate(angle=90)
#    return layout  

def weekly_mung():
    #for measuring script
    start_time = time.time()
    elapsed_time = time.time() - start_time
    
    print('weekly mung')
    print(elapsed_time)
    print(len(lts))
    chart_data = {}
   # df = pd.DataFrame(columns=lts.columns)
    ind = [row['created'] for row in lts]
    print(len(ind))
    #make data frame
    df = pd.DataFrame(data=list(lts.all()),index=ind)
     
    print('dataframe created. ET: %s' %(str(elapsed_time)))

    #convert datetimes
    df['user_created'] = pd.to_datetime(df['user_created'],format='%a %b %d %H:%M:%S +0000 %Y')
   
    df['created'] = pd.to_datetime(df['created'],format='%a %b %d %H:%M:%S +0000 %Y')
    print('datetimes converted. ET: %s' %(str(elapsed_time)))

    df['day'] = df['created'].apply(lambda x: x.weekday())
    print('lamda day, done')
    blobs = df['text'].apply(lambda x: TextBlob(x))
    print('blobs, done')
    df['polarity'] = blobs.apply(lambda x: x.sentiment.polarity)
    print('lamda polarity, done')
    df['subjectivity'] = blobs.apply(lambda x: x.sentiment.subjectivity)
    print('lamda subjectivity, done')
    df['nouns'] = blobs.apply(lambda x: x.noun_phrases)  
    print('lamda nouns, done')
  #  df['text'] = df['text'].apply(lambda x: re.sub('(?<=^|(?<=[^a-zA-Z0-9-_\.]))@([A-Za-z]+[A-Za-z0-9]+)|(\w+\.\.\.)|(RT)|(#\w+)|(\.\.\.)','',x))

    print('lamda re, done')
    print('lambdas done. ET: %s' %(str(elapsed_time)))
    #add labels
    df = add_sentiment_lab(df)

    #split between this week and last
    now = pd.to_datetime('now')

    week = DateOffset(weeks=1)
    #temp 2 and 3 weeks
    one_week_ago = now - (week)
    two_weeks_ago = now - (week * 2)
    #last week
    mask1 = (df['created'] < now) & (df['created'] >= one_week_ago)
    df_this_week = df.loc[mask1]
    #two weeks ago
    mask2 = (df['created'] < one_week_ago) & (df['created'] >= two_weeks_ago)
    #temporarily leave mask 1 in so there is data populated for testing
    print('df mask done. ET: %s' %(str(elapsed_time)))
    df_last_week = df.loc[mask2]

    this_week_urls, this_week_hashtags = make_entity_dfs(df_this_week)
    last_week_urls, last_week_hashtags = make_entity_dfs(df_last_week)

    this_week_nouns = make_freq_df(list_from_lists(df_this_week["nouns"],["rt","syria","whitehelmets"]))
    last_week_nouns = make_freq_df(list_from_lists(df_last_week["nouns"],["rt","syria","whitehelmets"]))
    trending_nouns = trending(this_week_nouns,last_week_nouns,'labels')

    trending_hashtags = trending(this_week_hashtags,last_week_hashtags,'labels')
    trending_urls = trending(this_week_urls,last_week_urls,'labels')

    # replace values from indexed days of the week to the explicit names
    day_of_the_week_replacements = {"labels":{0:"Mon",1:"Tues",2:"Wed",3:"Thurs",4:"Fri",5:"Sat",6:"Sun"}}
    chart_data["tweeting_freqs"] = make_frequency_data(list(df_this_week['day']),lab_replacements=day_of_the_week_replacements)
    chart_data['top_hashtags'] = data_from_freq_df(this_week_hashtags)
    chart_data['top_urls'] = data_from_freq_df(this_week_urls)
    chart_data['trending_hashtags'] = data_from_freq_df(trending_hashtags)
    chart_data['trending_urls'] = data_from_freq_df(trending_urls)
    chart_data['top_nouns'] = data_from_freq_df(this_week_nouns)
    chart_data['trending_nouns'] = data_from_freq_df(trending_nouns)
    chart_data['sentiment_pie'] = make_frequency_data(list(df['sentiment_lab']))
    print('made all the chart data I dont use anymore . ET: %s' %(str(elapsed_time)))
    #function to parse entities and return list of tlds shared
    def user_urls(grouped_entities):
        url_list = []
        for x in grouped_entities:
            _ , urls = extract_entities(x)
            url_list += [x.split('/')[0] for x in urls]
        return url_list

     #grouped dataframe with list of urls shared by each tweeter
    media_df = df.groupby(by=['user_name'])['entities'].apply(list).apply(user_urls)
    
    #counts all the times people shared fake news
    troll_shares = media_df.apply(lambda x: sum([y in haters for y in x]))
    troll_shares = troll_shares.nlargest(10)
    #adds 10 largest trolls
    chart_data['trolls'] = troll_shares.to_dict()
    

    domain_combine_list=[["youtube.com","youtu.be","m.youtube.com"],["google.com","goo.gl"] ,["facebook.com","fb.me","m.facebook.com"],["linkedin.com","lnkd.in"],["sputniknews.com","sptnkne.ws"],["rt.com","on.rt.com"],["twitter.com","mobile.twitter.com"],["thesyriacampaign.org","act.thesyriacampaign.org"]]
    remove_list = ["youtube.com","twitter.com","share.es","google.com","paper.li","tl.gd","wp.me","tmblr.co","ow.ly","linkedin.com","facebook.com"]
    #make graph
    graph = make_media_graph(list(media_df), combine_list=domain_combine_list, remove_list=remove_list)
    #apply fr layout in 3d to get coordinates
   # layout = graph.layout_fruchterman_reingold_3d()

    #rotate layout allong min axis
    #layout = graph_along_min_dim(layout)

             #apply fr layout in 3d to get coordinates
    #layout = graph.layout_fruchterman_reingold_3d()

    #rotate layout allong min axis
    #layout = graph_along_min_dim(layout)
    
   

    #takes graph object and returns dict in format suitable for plotly.js
    #TODO add something to check for media sources in nodes and color code
#    def make_plotly_graph(g, layout):
#        nodes = {"alt":{"x":[],"y":[],"z":[],"text":[],"marker":[]},
#                        "source":{"x":[],"y":[],"z":[],"text":[],"marker":[]}}
#        sizes = g.degree()
#        names = [node["name"] for node in g.vs]
#        for idx, value in enumerate(layout.coords):
#            size = sizes[idx]
#            name = names[idx]
#            coords = layout.coords[idx]
#         
#            if name in haters:
#                nodes["alt"]["x"].append(round(coords[0],2))
#                nodes["alt"]["y"].append(round(coords[1],2))
#                nodes["alt"]["z"].append(round(coords[2],2))
#                nodes["alt"]["text"].append(name)
#                nodes["alt"]["marker"].append(size)
#            else :
#                nodes["source"]["x"].append(round(coords[0],2))
#                nodes["source"]["y"].append(round(coords[1],2))
#                nodes["source"]["z"].append(round(coords[2],2))
#                nodes["source"]["text"].append(name)
#                nodes["source"]["marker"].append(size)
#         
         
                
#        edges = make_graph_edges(g,layout)
#        return {'nodes_alt':nodes["alt"],'nodes_source':nodes["source"],'edges':edges}


    chart_data['media_graph'] = make_graph_data(graph)
    
    chart_data['time'] = {'year':now.year,'month':now.month,'day':now.day, 'formatted':now.strftime('%m/%d/%Y %I%p')}
    print('ready to put in amazon . ET: %s' %(str(elapsed_time)))
    obj.put(Body=json.dumps(chart_data, cls=MyEncoder))
    obj_acl.put(ACL= 'public-read')
    print('put in amazon Done. ET: %s' %(str(elapsed_time)))
 #   with open("charts.json", "w") as outFile:
  #      json.dump(chart_data,outFile,cls=MyEncoder)

weekly_mung()



#run weekly mung every friday at noon
#schedule.every().day.at("12:00").do(weekly_mung)

#while True:
#    schedule.run_pending()
#    time.sleep(1)
