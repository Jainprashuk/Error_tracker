"""
Error reporting routes for the Error Tracker Collector.
Handles incoming error reports from client-side SDKs and stores them in the database.
"""

from fastapi import APIRouter
from app.models.error_model import ErrorPayload
from app.services.ticket_service import create_ticket

# Create APIRouter instance for error-related endpoints
router = APIRouter()

# POST endpoint to receive error reports from clients
@router.post("/report")
def report_error(payload: ErrorPayload):
    """
    Endpoint to receive and store error reports from client applications.
    
    Args:
        payload (ErrorPayload): The error data sent by the client, includes:
            - project: Name of the project reporting the error
            - timestamp: When the error occurred
            - request: Optional HTTP request details (URL, method, payload)
            - response: Optional HTTP response details (status, data)
            - error: Error information (message, stack trace)
    
    Returns:
        dict: Status confirmation that the error was received
    """
    
    # Log that an error report was received
    print("Error received")

    # Process and store the error in the database
    # This creates a new error entry or updates an existing one if it's a duplicate
    create_ticket(payload)

    # Return confirmation that the error was accepted
    return {"status": "received"}