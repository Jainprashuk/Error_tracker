import asyncio
import os
from bson import ObjectId
from app.services.db import init_db, db, projects_collection
from app.services.alert_service import get_project_alert_config
from app.services.email_service import send_email_alert

async def test():
    await init_db()
    
    # 1. List projects
    projects = await projects_collection.find().to_list(length=10)
    print(f"🔍 Found {len(projects)} projects")
    
    for p in projects:
        p_id = str(p["_id"])
        print(f"\n--- Project: {p['name']} ({p_id}) ---")
        
        # 2. Get Alert Config
        config = await get_project_alert_config(p_id)
        print(f"⚙️  Alert Config: {config}")
        
        if not config.get("channels", {}).get("email", {}).get("recipients"):
            print("❌ No recipients configured!")
        else:
            print(f"✅ Recipients: {config['channels']['email']['recipients']}")
            
        # 3. Test Email
        print("📧 Sending test email...")
        payload = {
            "alert_type": "TEST_ALERT",
            "error_message": "This is a diagnostic test of the alerting system.",
            "project_name": p["name"],
            "dashboard_link": "http://localhost:3000",
            "new_errors_count": 1,
            "total_count": 1
        }
        success = await send_email_alert(config["channels"]["email"]["recipients"], payload)
        print(f"🚀 Result: {'SUCCESS' if success else 'FAILED'}")

if __name__ == "__main__":
    asyncio.run(test())
