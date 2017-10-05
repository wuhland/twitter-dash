
"""
Created on Tue Oct  3 17:23:36 2017

@author: ds
"""
TRACK_TERMS = ["#whitehelmets"]
CONNECTION_STRING = "sqlite:///:memory:"
CONNECTION_STRING_LTS = "sqlite:///lts.db"
TABLE_NAME = "WH"
# =============================================================================
# CONSUMER_KEY = 'bN7VSMVUwMhImQ8kzLie1It4J'
# CONSUMER_SECRET = 'X11EV8SAym7aIjuNXv6ojLuXsa7KTjfsJp4gWfxQUCb6FI11Rc'
# ACCESS_TOKEN = '28627512-soEZFN7GHU5liLyC8RqL7CipuiEBb0gBZxUpwbcyk'
# ACCESS_TOKEN_SECRET = 'IeFjq3ycaD7hoLiegbVeeIJXM3yqjkrDaxPxdnmAOHUNX'
# =============================================================================


try:
    from twitter_private import *
except Exception:
    pass
try:
    from aws_private import *
except Exception:
    pass
