"""
Database connection and collection initialization module.
Establishes MongoDB connection and provides access to error collections.
"""

import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get MongoDB URL from environment variables
mongourl = os.getenv("mongo_uri")

# Validate that MongoDB URL is configured
if not mongourl:
    raise ValueError("mongo_uri environment variable is not set. Please add it to your .env file.")

# Connect to MongoDB Atlas cluster
client = MongoClient(mongourl)

# Select the specific database named "error_tracker_db" to work with
db = client[ os.getenv("db_name")]

# Get reference to the "errors" collection where all error documents will be stored
# Collections are like tables in SQL databases, storing documents (JSON-like objects)
errors_collection = db["errors"]