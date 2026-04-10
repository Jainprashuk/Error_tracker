"""
Database connection and collection initialization module.
Establishes MongoDB connection using Motor for asynchronous access.
"""

import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load .env variables
load_dotenv()

# Get MongoDB URI
mongo_uri = os.getenv("mongo_uri")
db_name = os.getenv("db_name", "error_tracker_db")

if not mongo_uri:
    raise ValueError("mongo_uri environment variable is not set. Please add it to your .env file.")

# Configure the Async MongoDB client
# 💡 maxPoolSize=10 is a good balance for serverless to prevent exhaustion.
# 💡 minPoolSize=1 keeps a connection warm.
client = AsyncIOMotorClient(
    mongo_uri,
    maxPoolSize=10,
    minPoolSize=1,
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=10000,
    retryWrites=True,
    retryReads=True
)

db = client[db_name]

from pymongo import WriteConcern

# Collections
users_collection = db["users"]
projects_collection = db["projects"]
errors_collection = db["errors"]

# 💡 P1 FIX: Use WriteConcern(w=1) for events to maximize ingestion speed.
# We don't need majority acknowledgment for every single occurrence.
events_collection = db.get_collection("events", write_concern=WriteConcern(w=1))

alerts_config_collection = db["alert_configs"]
alerts_logs_collection = db["alert_logs"]
pending_alerts_collection = db["pending_alerts"] # 🔥 New: For reliable delivery
performance_collection = db["performance_metrics"]  # 🚀 Dedicated performance stream


async def init_db():
    """
    Initializes database indexes. 
    Should be called during app startup (e.g., lifespan in FastAPI).
    """
    try:
        # Index for error grouping
        await errors_collection.create_index(
            [("project_id", 1), ("fingerprint", 1)],
            name="idx_project_fingerprint",
            background=True
        )
        
        # P0 FIX: TTL Index for automatic data retention (30 days)
        # This keeps the 'events' collection from growing forever.
        await events_collection.create_index(
            "created_at", 
            expireAfterSeconds=30 * 24 * 3600,
            background=True
        )
        
        # P0 FIX: Critical index for project API key lookup
        await projects_collection.create_index("api_key", unique=True, background=True)

        # Performance metrics: compound index for per-project, per-route queries
        await performance_collection.create_index(
            [("project_id", 1), ("route", 1)],
            name="idx_perf_project_route",
            background=True
        )
        # TTL Index for performance metrics (90-day retention)
        await performance_collection.create_index(
            "created_at",
            expireAfterSeconds=90 * 24 * 3600,
            background=True
        )
        print("✅ Database indexes verified")
    except Exception as e:
        print(f"⚠️ Error initializing indexes: {e}")