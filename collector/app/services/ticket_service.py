from app.utils.fingerprint import generate_fingerprint
from app.services.db import errors_collection
from datetime import datetime
from app.utils.stack_parser import parse_stack_trace
from app.utils.s3upload import upload_screenshot


from app.services.alert_service import get_project_alert_config, should_send_alert, update_alert_status, log_alert
from app.services.email_service import send_email_alert
from app.services.db import db
from bson import ObjectId
import os

projects_collection = db["projects"]

async def ParseError(payload, project_id):

    endpoint = None
    message = None
    stack = None
    screenshot_url = None
    event_type = payload.get("event_type")

    # 📸 Screenshot upload
    try:
        if payload.get("screenshot"):
            screenshot_url = upload_screenshot(payload["screenshot"])
    except Exception:
        screenshot_url = None

    # 🌐 Request
    request = payload.get("request") or {}
    endpoint = request.get("url")

    # ❌ Error
    error = payload.get("error") or {}
    message = error.get("message")
    stack = error.get("stack")

    # 📍 Location
    location = parse_stack_trace(stack) if stack else None

    # 🔑 Fingerprint (UPDATED)
    fingerprint = generate_fingerprint(
        endpoint=endpoint,
        message=message,
        stack=stack,
        event_type=event_type,
        project_id=str(project_id)
    )

    existing = errors_collection.find_one({
        "project_id": project_id,
        "fingerprint": fingerprint
    })

    update_data = {
        "last_seen": datetime.utcnow(),
        "event_type": event_type,
        "location": location,
        "payload": payload   # 🔥 ADD THIS
    }

    if screenshot_url:
        update_data["screenshot_url"] = screenshot_url

    if existing:

        errors_collection.update_one(
            {
                "project_id": project_id,
                "fingerprint": fingerprint
            },
            {
                "$inc": {"occurrences": 1},
                "$set": update_data
            }
        )
        # Re-fetch existing to get updated count for alert check
        updated_error = errors_collection.find_one({"fingerprint": fingerprint})
    
    else:

        new_error = {
            "project_id": project_id,
            "fingerprint": fingerprint,
            "event_type": event_type,
            "payload": payload,
            "location": location,
            "screenshot_url": screenshot_url,
            "occurrences": 1,
            "first_seen": datetime.utcnow(),
            "last_seen": datetime.utcnow(),
            "is_ticket_generated": False
        }
        errors_collection.insert_one(new_error)
        updated_error = new_error

    # --- 🚨 Alerting System Integration 🚨 ---
    try:
        project_config = get_project_alert_config(str(project_id))
        project = projects_collection.find_one({"_id": ObjectId(project_id)})
        project_name = project.get("name", "Unknown Project") if project else "Unknown Project"
        
        alert_type = should_send_alert(updated_error, project_config)
        
        if alert_type:
            recipients = project_config.get("channels", {}).get("email", {}).get("recipients", [])
            
            email_payload = {
                "alert_type": alert_type,
                "error_message": message or "No message",
                "project_name": project_name,
                "dashboard_link": f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/error/{fingerprint}",
                "new_errors_count": updated_error.get("occurrences", 1) - updated_error.get("notifiedCount", 0),
                "total_count": updated_error.get("occurrences", 1),
                "screenshot_url": screenshot_url,
                "ticket_url": updated_error.get("ticket_url")
            }

            print("sending alert to " , recipients)
            
            # Send alert
            success = await send_email_alert(recipients, email_payload)

            print("alert sent successfully" , success)
            
            if success:
                # Update lastNotifiedAt and notifiedCount
                update_alert_status(fingerprint, updated_error.get("occurrences", 1))
                # Log the alert decision
                log_alert(str(project_id), fingerprint, alert_type, f"Sent alert successfully to {len(recipients)} recipients")
            else:
                log_alert(str(project_id), fingerprint, "ERROR", f"Failed to send alert of type {alert_type}")
                
    except Exception as e:
        print(f"❌ Error in alerting system: {str(e)}")