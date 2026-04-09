import asyncio
import os
from bson import ObjectId
from app.services.db import init_db, db, projects_collection
from app.services.alert_service import get_project_alert_config
from app.services.email_service import send_email_alert

async def test():
    await init_db()
    
    p_id = "69d68a921a3ea38b1358f565"
    print(f"\n🔍 Checking target project: {p_id}")
    
    project = await projects_collection.find_one({"_id": ObjectId(p_id)})
    if not project:
        print("❌ Project not found in DB!")
        return

    print(f"--- Project: {project['name']} ---")
    
    # Get Alert Config
    config = await get_project_alert_config(p_id)
    print(f"⚙️  Alert Config: {config}")
    
    recipients = config.get("channels", {}).get("email", {}).get("recipients", [])
    enabled = config.get("channels", {}).get("email", {}).get("enabled", False)
    
    print(f"📧 Enabled: {enabled}")
    print(f"👥 Recipients: {recipients}")
    
    if not enabled:
        print("❌ Email alerts are DISABLED for this project.")
    if not recipients:
        print("❌ No recipients found.")

if __name__ == "__main__":
    asyncio.run(test())
