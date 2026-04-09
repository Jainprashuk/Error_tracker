from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from app.services.db import db
from bson import ObjectId

alerts_config_collection = db["alert_configs"]
alerts_logs_collection = db["alert_logs"]

DEFAULT_CONFIG = {
    "channels": {
        "email": {
            "enabled": True,
            "recipients": []
        }
    },
    "triggers": {
        "newError": True,
        "spike": {
            "enabled": False,
            "threshold": 10
        }
    },
    "cooldown": 60  # minutes
}

async def get_project_alert_config(project_id: str) -> Dict[str, Any]:
    config = await alerts_config_collection.find_one({"projectId": ObjectId(project_id)})
    if not config:
        # Create default config if it doesn't exist
        config = {**DEFAULT_CONFIG, "projectId": ObjectId(project_id)}
        await alerts_config_collection.insert_one(config)
    
    config["_id"] = str(config["_id"])
    config["projectId"] = str(config["projectId"])
    return config

def should_send_alert(error_group: Dict[str, Any], config: Dict[str, Any]):
    """
    Returns alert type (NEW_ERROR / SPIKE) or None.
    """
    # 0. Global Channel Check
    channels = config.get("channels", {})
    email_channel = channels.get("email", {})
    if not email_channel.get("enabled"):
        return None

    now = datetime.utcnow()
    last_notified = error_group.get("lastNotifiedAt")
    cooldown_minutes = config.get("cooldown", 60)
    
    # 1. Cooldown check
    if last_notified:
        diff = now - last_notified
        if diff < timedelta(minutes=cooldown_minutes):
            return None
    
    count = error_group.get("occurrences", 1)
    notified_count = error_group.get("notifiedCount", 0)
    
    triggers = config.get("triggers", {})
    
    # 2. New Error (or newly seen by alert system)
    # 💡 FIX: If notified_count is 0, it means we have NEVER sent an alert for this fingerprint.
    # This allows alerting even if the error happened before recipients were configured.
    if notified_count == 0 and triggers.get("newError"):
        return "NEW_ERROR"
    
    # 3. Spike
    spike_config = triggers.get("spike", {})
    if spike_config.get("enabled"):
        threshold = spike_config.get("threshold", 10)
        new_since_last = count - notified_count
        if new_since_last >= threshold:
            return "SPIKE"
            
    return None


async def update_alert_status(fingerprint: str, count: int):
    # Using local import to avoid circular dependencies if any
    from app.services.db import errors_collection
    await errors_collection.update_one(
        {"fingerprint": fingerprint},
        {
            "$set": {
                "lastNotifiedAt": datetime.utcnow(),
                "notifiedCount": count
            }
        }
    )

async def log_alert(project_id: str, fingerprint: str, alert_type: str, detail: str):
    await alerts_logs_collection.insert_one({
        "projectId": ObjectId(project_id),
        "fingerprint": fingerprint,
        "type": alert_type,
        "detail": detail,
        "createdAt": datetime.utcnow()
    })

