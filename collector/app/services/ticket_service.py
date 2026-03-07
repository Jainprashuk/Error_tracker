from app.utils.fingerprint import generate_fingerprint
from app.services.db import errors_collection
from datetime import datetime
from app.utils.stack_parser import parse_stack_trace


def create_ticket(error_payload, project_id):

    endpoint = None
    message = None
    stack = None

    if error_payload.request:
        endpoint = error_payload.request.url

    if error_payload.error:
        message = error_payload.error.message
        stack = error_payload.error.stack

    fingerprint = generate_fingerprint(endpoint or "unknown", message or "unknown")

    # 🔥 parse stack trace
    location = parse_stack_trace(stack)

    existing = errors_collection.find_one({
        "project_id": project_id,
        "fingerprint": fingerprint
    })

    if existing:

        errors_collection.update_one(
            {
                "project_id": project_id,
                "fingerprint": fingerprint
            },
            {
                "$inc": {"occurrences": 1},
                "$set": {
                    "last_seen": datetime.utcnow(),
                    "error_type": error_payload.error_type,
                    "location": location
                }
            }
        )

    else:

        errors_collection.insert_one({
            "project_id": project_id,
            "fingerprint": fingerprint,
            "error_type": error_payload.error_type,
            "payload": error_payload.model_dump(),

            # 🔥 new field
            "location": location,

            "occurrences": 1,
            "first_seen": datetime.utcnow(),
            "last_seen": datetime.utcnow()
        })