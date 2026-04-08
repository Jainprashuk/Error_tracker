"""
Database connection and collection initialization module.
Establishes MongoDB connection and provides access to collections.
"""

import os
import ssl
from pymongo import MongoClient
from dotenv import load_dotenv

# Load .env variables
load_dotenv()

# Get MongoDB URI
mongo_uri = os.getenv("mongo_uri")

if not mongo_uri:
    raise ValueError("mongo_uri environment variable is not set. Please add it to your .env file.")

# Connect to MongoDB with proper SSL configuration
# Use retryWrites=true and w=majority for production reliability
try:
    client = MongoClient(
        mongo_uri,
        ssl=True,
        ssl_cert_reqs=ssl.CERT_REQUIRED,
        retryWrites=True,
        w="majority",
        serverSelectionTimeoutMS=30000,
        connectTimeoutMS=30000,
        socketTimeoutMS=30000
    )
except Exception as e:
    print(f"⚠️  SSL error detected, retrying with alternate settings: {e}")
    # Fallback connection with different SSL settings
    client = MongoClient(
        mongo_uri,
        tlsCAFile=None,
        retryWrites=True,
        serverSelectionTimeoutMS=30000,
        connectTimeoutMS=30000
    )

# Verify connection
try:
    client.admin.command('ping')
    print("✅ Successfully connected to MongoDB Atlas")
except Exception as e:
    print(f"❌ MongoDB connection failed: {e}")
    raise

# Select database
db = client[os.getenv("db_name")]

# Collections
users_collection = db["users"]
projects_collection = db["projects"]
errors_collection = db["errors"]

# Create indexes for performance (background=True prevents locking)
errors_collection.create_index(
    [("project_id", 1), ("fingerprint", 1)],
    name="idx_project_fingerprint",
    background=True
)