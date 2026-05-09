import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from bson import ObjectId
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

async def migrate_orphaned_projects():
    mongo_uri = os.getenv("mongo_uri")
    db_name = os.getenv("db_name", "error_tracker_db")
    client = AsyncIOMotorClient(mongo_uri)
    db = client[db_name]
    
    projects_col = db["projects"]
    orgs_col = db["organizations"]
    members_col = db["org_members"]
    users_col = db["users"]
    
    # Find projects without org_id
    orphans = await projects_col.find({"org_id": {"$exists": False}}).to_list(length=1000)
    print(f"Found {len(orphans)} orphaned projects.")
    
    for project in orphans:
        project_id = project["_id"]
        user_id = project.get("user_id")
        
        if not user_id:
            print(f"Skipping project {project_id}: no user_id found.")
            continue
            
        # 1. Find or create org for this user
        org = await orgs_col.find_one({"owner_id": str(user_id)})
        if not org:
            user = await users_col.find_one({"_id": ObjectId(user_id)})
            user_name = user.get("name", "Unknown") if user else "User"
            org_doc = {
                "name": f"{user_name}'s Org (Migrated)",
                "slug": f"migrated-{user_id}",
                "owner_id": str(user_id),
                "created_at": datetime.utcnow()
            }
            org_result = await orgs_col.insert_one(org_doc)
            org_id = org_result.inserted_id
            
            # Create membership
            await members_col.insert_one({
                "org_id": str(org_id),
                "user_id": str(user_id),
                "role": "admin",
                "created_at": datetime.utcnow()
            })
            print(f"Created new org {org_id} for user {user_id}")
        else:
            org_id = org["_id"]
            
        # 2. Assign org_id to project
        await projects_col.update_one(
            {"_id": project_id},
            {"$set": {"org_id": org_id}}
        )
        print(f"Linked project {project_id} to org {org_id}")

    print("Migration complete.")

if __name__ == "__main__":
    asyncio.run(migrate_orphaned_projects())
