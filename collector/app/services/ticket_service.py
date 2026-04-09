from app.utils.fingerprint import generate_fingerprint
from app.services.db import errors_collection
from datetime import datetime
from app.utils.stack_parser import parse_stack_trace
from app.utils.s3upload import upload_screenshot


from app.services.alert_service import get_project_alert_config, should_send_alert, update_alert_status, log_alert
from app.services.email_service import send_email_alert
import os
import structlog
from app.services.db import db, events_collection, pending_alerts_collection
from bson import ObjectId


logger = structlog.get_logger()
projects_collection = db["projects"]
errors_collection = db["errors"]



async def ParseError(payload, project_id):
    endpoint = None
    message = None
    stack = None
    screenshot_url = None
    event_type = payload.get("event_type")

    # 📸 Screenshot upload (Still sync but in BackgroundTask thread so okay for now,
    # though it should eventually be async boto3/httpx)
    try:
        if payload.get("screenshot"):
            # This is sync, but BackgroundTasks runs it in a threadpool
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

    # 🔑 Fingerprint
    fingerprint = generate_fingerprint(
        endpoint=endpoint,
        message=message,
        stack=stack,
        event_type=event_type,
        project_id=str(project_id)
    )

    # 💡 P1: Await DB lookup
    existing = await errors_collection.find_one({
        "project_id": project_id,
        "fingerprint": fingerprint
    })

    update_data = {
        "last_seen": datetime.utcnow(),
        "event_type": event_type,
        "location": location
    }

    if screenshot_url:
        update_data["screenshot_url"] = screenshot_url
        
    # 💎 P1 FIX: Store individual event occurrence for historical analysis
    await events_collection.insert_one({
        "project_id": project_id,
        "fingerprint": fingerprint,
        "payload": payload,
        "screenshot_url": screenshot_url,
        "created_at": datetime.utcnow() # Trigger for TTL 30-day purge
    })

    if existing:
        # 💡 P1: Await DB update
        await errors_collection.update_one(
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
        updated_error = await errors_collection.find_one({"fingerprint": fingerprint})
    else:
        new_error = {
            "project_id": project_id,
            "fingerprint": fingerprint,
            "event_type": event_type,
            "location": location,
            "screenshot_url": screenshot_url,
            "occurrences": 1,
            "first_seen": datetime.utcnow(),
            "last_seen": datetime.utcnow(),
            "is_ticket_generated": False
        }
        await errors_collection.insert_one(new_error)
        updated_error = new_error

    # --- 🚨 Alerting System Integration ---
    try:
        project_config = await get_project_alert_config(str(project_id))
        project = await projects_collection.find_one({"_id": ObjectId(project_id)})
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
            
            # Send alert
            success = await send_email_alert(recipients, email_payload)
            
            if success:
                # 💡 P1: Await status update
                await update_alert_status(fingerprint, updated_error.get("occurrences", 1))
                # 💡 P1: Await logging
                await log_alert(str(project_id), fingerprint, alert_type, f"Sent alert successfully to {len(recipients)} recipients")
            else:
                # 💡 P1 FIX: Email Outbox Pattern
                # If provider is down, save to pending_alerts for retry
                await pending_alerts_collection.insert_one({
                    "projectId": ObjectId(project_id),
                    "fingerprint": fingerprint,
                    "payload": email_payload,
                    "recipients": recipients,
                    "retry_count": 0,
                    "created_at": datetime.utcnow()
                })
                logger.error("email_delivery_failed_queued", project_id=str(project_id), fingerprint=fingerprint)
                await log_alert(str(project_id), fingerprint, "PENDING", "Email provider failed. Alert queued for retry.")

                
    except Exception as e:
        logger.error("alerting_system_failure", project_id=str(project_id), error=str(e))