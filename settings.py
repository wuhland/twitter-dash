
"""
Created on Tue Oct  3 17:23:36 2017

@author: ds
"""
TRACK_TERMS = ["#whitehelmets"]
CONNECTION_STRING = "sqlite:///:memory:"
CONNECTION_STRING_LTS = "sqlite:///lts.db"
TABLE_NAME = "WH"

try:
    from twitter_private import *
except Exception:
    pass
try:
    from aws_private import *
except Exception:
    pass
