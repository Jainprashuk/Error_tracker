"""
Database connection and collection initialization module.
Establishes MongoDB connection and provides access to collections.
"""

import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load .env variables
load_dotenv()

# Get MongoDB URI
mongo_uri = os.getenv("mongo_uri")

if not mongo_uri:
    raise ValueError("mongo_uri environment variable is not set. Please add it to your .env file.")

# Connect to MongoDB
client = MongoClient(mongo_uri)

# Select database
db = client[os.getenv("db_name")]

# Collections
users_collection = db["users"]
projects_collection = db["projects"]
errors_collection = db["errors"]