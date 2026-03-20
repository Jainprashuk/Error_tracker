from pydantic import BaseModel
from typing import Optional, Dict, Any


class RequestData(BaseModel):
    url: Optional[str] = None
    method: Optional[str] = None
    payload: Optional[Any] = None   # 🔥 change (not always dict)


class ResponseData(BaseModel):
    status: Optional[int] = None
    data: Optional[Any] = None


class ErrorInfo(BaseModel):
    message: Optional[str] = None
    stack: Optional[str] = None
    type: Optional[str] = None   # 🔥 ADD (SDK me hai)


class ErrorPayload(BaseModel):
    timestamp: str
    event_type: Optional[str] = None

    request: Optional[RequestData] = None
    response: Optional[ResponseData] = None
    error: Optional[ErrorInfo] = None

    performance: Optional[Dict[str, Any]] = None   # 🔥 ADD THIS (MAIN FIX)

    client: Optional[Dict[str, Any]] = None        # 🔥 ADD
    metadata: Optional[Dict[str, Any]] = None      # 🔥 ADD

    screenshot: Optional[str] = None

    class Config:
        extra = "allow"   # 🔥 future-proof (VERY IMPORTANT)