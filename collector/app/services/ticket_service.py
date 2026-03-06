"""
Error ticket creation and management service.
Handles deduplication of errors using fingerprints and stores/updates error records.
"""

from app.utils.fingerprint import generate_fingerprint
from app.services.db import errors_collection
from datetime import datetime


def create_ticket(error_payload):
    """
    Create a new error ticket or update an existing one if it's a duplicate.
    
    This function:
    1. Extracts endpoint and error message from the payload
    2. Generates a unique fingerprint for the error
    3. Checks if this error has been reported before
    4. Either creates a new error entry or increments the occurrence count
    
    Args:
        error_payload: ErrorPayload object containing error details
    """
    
    # Initialize variables to hold error details
    endpoint = None  # Will store the URL where error occurred
    message = None   # Will store the error message

    # Extract endpoint URL from request information if available
    if error_payload.request:
        endpoint = error_payload.request.url

    # Extract error message from error information if available
    if error_payload.error:
        message = error_payload.error.message

    # Generate a unique fingerprint for this error
    # Fingerprint = SHA256 hash of (endpoint + message)
    # This allows us to identify duplicate errors even if they occur at different times
    fingerprint = generate_fingerprint(endpoint or "unknown", message or "unknown")

    # Query the database to see if we've already recorded this error
    existing = errors_collection.find_one({"fingerprint": fingerprint})

    if existing:
        # Error already exists - increment the occurrence counter and update last_seen timestamp
        errors_collection.update_one(
            {"fingerprint": fingerprint},
            {
                "$inc": {"occurrences": 1},  # Increment occurrences by 1
                "$set": {"last_seen": datetime.utcnow()}  # Update when we last saw this error
            }
        )

    else:
        # New error - create a new document in the errors collection
        errors_collection.insert_one({
            "fingerprint": fingerprint,  # Unique identifier for this error
            "project": error_payload.project,  # Project name
            "payload": error_payload.model_dump(),  # Full error payload for debugging
            "occurrences": 1,  # Initialize occurrence count to 1
            "first_seen": datetime.utcnow(),  # Timestamp of first occurrence
            "last_seen": datetime.utcnow()  # Timestamp of most recent occurrence
        })