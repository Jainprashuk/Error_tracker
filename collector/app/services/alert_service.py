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

def get_project_alert_config(project_id: str) -> Dict[str, Any]:
    config = alerts_config_collection.find_one({"projectId": ObjectId(project_id)})
    if not config:
        # Create default config if it doesn't exist
        config = {**DEFAULT_CONFIG, "projectId": ObjectId(project_id)}
        alerts_config_collection.insert_one(config)
    
    config["_id"] = str(config["_id"])
    config["projectId"] = str(config["projectId"])
    return config

def should_send_alert(error_group: Dict[str, Any], config: Dict[str, Any]):
    """
    Returns alert type (NEW_ERROR / SPIKE) or None
    """
    print(config , "<-- Config for project")
    now = datetime.utcnow()
    last_notified = error_group.get("lastNotifiedAt")
    cooldown_minutes = config.get("cooldown", 60)
    
    fingerprint = error_group.get("fingerprint")
    print(f"🔔 [ALERT ENGINE] Checking fingerprint: {fingerprint}")

    # 1. Cooldown check
    if last_notified:
        diff = now - last_notified
        if diff < timedelta(minutes=cooldown_minutes):
            print(f"   ⏳ Cooldown ACTIVE: {diff.total_seconds() / 60:.1f}m elapsed < {cooldown_minutes}m")
            return None
        print(f"   ✅ Cooldown EXPIRED: {diff.total_seconds() / 60:.1f}m elapsed")
    
    count = error_group.get("occurrences", 1)
    notified_count = error_group.get("notifiedCount", 0)
    
    triggers = config.get("triggers", {})
    
    # 2. New Error
    if count == 1 and triggers.get("newError"):
        print(f"   ✨ Trigger: NEW_ERROR (Match)")
        return "NEW_ERROR"
    
    # 3. Spike
    spike_config = triggers.get("spike", {})
    if spike_config.get("enabled"):
        threshold = spike_config.get("threshold", 10)
        new_since_last = count - notified_count
        if new_since_last >= threshold:
            print(f"   📈 Trigger: SPIKE Match ({new_since_last} new errors >= {threshold})")
            return "SPIKE"
        print(f"   ℹ️  Spike Info: {new_since_last} new errors < {threshold} threshold")
            
    print(f"   💤 Decision: NO_ALERT")
    return None

def update_alert_status(fingerprint: str, count: int):
    print(f"🔄 [DB UPDATE] Updating alert status for fingerprint: {fingerprint}")
    print(f"   Setting notifiedCount to: {count}")
    from app.services.db import errors_collection
    res = errors_collection.update_one(
        {"fingerprint": fingerprint},
        {
            "$set": {
                "lastNotifiedAt": datetime.utcnow(),
                "notifiedCount": count
            }
        }
    )
    print(f"   Update result matched_count: {res.matched_count}")

def log_alert(project_id: str, fingerprint: str, alert_type: str, detail: str):
    print(f"📝 [DB LOG] Creating alert log for project_id: {project_id}")
    print(f"   Type: {alert_type}, Detail: {detail}")
    alerts_logs_collection.insert_one({
        "projectId": ObjectId(project_id),
        "fingerprint": fingerprint,
        "type": alert_type,
        "detail": detail,
        "createdAt": datetime.utcnow()
    })
