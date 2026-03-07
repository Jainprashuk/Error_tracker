#!/usr/bin/env python3
"""
Seed demo user to MongoDB for testing
"""
from app.services.db import users_collection
from datetime import datetime

def seed_demo_user():
    """Create demo user for testing login"""
    
    # Check if demo user exists
    demo_user = users_collection.find_one({"email": "demo@example.com"})
    
    if demo_user:
        print("✅ Demo user already exists in MongoDB")
        print(f"   User ID: {demo_user['_id']}")
        print(f"   Email: {demo_user['email']}")
        print(f"   Name: {demo_user['name']}")
        return
    
    print("Creating demo user...")
    
    result = users_collection.insert_one({
        "email": "demo@example.com",
        "name": "Demo User",
        "password": "password123",
        "created_at": datetime.utcnow()
    })
    
    print("✅ Demo user created successfully!")
    print(f"   User ID: {result.inserted_id}")
    print(f"   Email: demo@example.com")
    print(f"   Password: password123")
    print(f"   Name: Demo User")

if __name__ == "__main__":
    seed_demo_user()
