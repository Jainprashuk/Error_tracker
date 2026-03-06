"""
Pydantic models for error data validation and serialization.
These models define the structure of error reports received from clients.
"""

from pydantic import BaseModel
from typing import Optional, Dict, Any


class RequestData(BaseModel):
    """
    Model for HTTP request information related to an error.
    Captures details about the request that triggered the error.
    """
    url: Optional[str] = None  # URL of the request
    method: Optional[str] = None  # HTTP method (GET, POST, etc.)
    payload: Optional[Dict[str, Any]] = None  # Request body/parameters


class ResponseData(BaseModel):
    """
    Model for HTTP response information related to an error.
    Captures details about the response received.
    """
    status: Optional[int] = None  # HTTP status code (200, 404, 500, etc.)
    data: Optional[Any] = None  # Response body/data


class ErrorInfo(BaseModel):
    """
    Model for error details and stack trace.
    Contains the error message and stack trace information.
    """
    message: Optional[str] = None  # Error message/description
    stack: Optional[str] = None  # Stack trace showing where the error occurred


class ErrorPayload(BaseModel):
    """
    Main model for complete error reports from clients.
    This is the structure expected by the /report endpoint.
    """
    project: str  # Required: Name of the project reporting the error
    timestamp: str  # Required: ISO format timestamp of when the error occurred

    # Optional: HTTP request details if the error occurred during an API call
    request: Optional[RequestData] = None
    # Optional: HTTP response details if available
    response: Optional[ResponseData] = None
    # Optional: Error details (message, stack trace)
    error: Optional[ErrorInfo] = None