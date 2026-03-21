from app.utils.fingerprint import generate_fingerprint
from app.services.db import errors_collection
from datetime import datetime
from app.utils.stack_parser import parse_stack_trace
from app.utils.s3upload import upload_screenshot


def ParseError(payload, project_id):

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

    else:

        errors_collection.insert_one({
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
        })