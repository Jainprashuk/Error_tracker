from fastapi import APIRouter, Request, HTTPException, BackgroundTasks
from app.models.error_model import ErrorPayload
from app.services.ticket_service import ParseError
from app.services.db import db, projects_collection, errors_collection, events_collection
from bson import ObjectId
import json

router = APIRouter()

from typing import Union, List

@router.post("/report")
async def report_error(payload: Union[ErrorPayload, List[ErrorPayload]], background_tasks: BackgroundTasks, request: Request):
    """
    Primary ingestion endpoint. Supports both Single and Batch (Array) reporting.
    Validates API key and enqueues processing.
    """
    api_key = request.headers.get("x-api-key")

    if not api_key:
        raise HTTPException(status_code=401, detail="API key missing")

    # 💡 P1: Project lookup is awaited but will be faster with index + future caching
    project = await projects_collection.find_one({"api_key": api_key})

    if not project:
        raise HTTPException(status_code=401, detail="Invalid API key")

    # 🔥 P0 FIX: Handle both single object and list of objects
    if isinstance(payload, list):
        for item in payload:
            background_tasks.add_task(ParseError, item.model_dump(), project["_id"])
    else:
        background_tasks.add_task(ParseError, payload.model_dump(), project["_id"])

    return {"status": "received", "batch_size": len(payload) if isinstance(payload, list) else 1}


# GET all errors of a project (with pagination)
@router.get("/projects/{project_id}/errors")
async def get_project_errors(project_id: str, page: int = 1, limit: int = 50):

    skip = (page - 1) * limit

    errors = await errors_collection.find(
        {"project_id": ObjectId(project_id)},
        {
            "_id": 1,
            "fingerprint": 1,
            "event_type": 1,
            "occurrences": 1,
            "first_seen": 1,
            "last_seen": 1,
            "location": 1,
            "is_ticket_generated": 1,
            "ticket_url": 1
        }
    ).sort("last_seen", -1).skip(skip).limit(limit).to_list(length=limit)

    # Convert ObjectId to str for JSON
    for e in errors:
        e["_id"] = str(e["_id"])

    # 💡 P0 FIX: Get total count for accurate dashboard stats
    total = await errors_collection.count_documents({"project_id": ObjectId(project_id)})

    return {
        "page": page,
        "limit": limit,
        "total": total,
        "data": errors
    }




# GET error details
@router.get("/errors/{fingerprint}")
async def get_error_detail(fingerprint: str):
    # 💡 P0 FIX: Get the Group metadata
    error = await errors_collection.find_one({"fingerprint": fingerprint})
    if not error:
        raise HTTPException(status_code=404, detail="Error not found")

    # 💡 P0 FIX: Fetch the LATEST event occurrence to get the full payload/stack trace
    latest_event = await events_collection.find_one(
        {"fingerprint": fingerprint},
        sort=[("created_at", -1)]
    )

    if latest_event:
        error["payload"] = latest_event.get("payload")
    
    # Convert ObjectIds → strings for JSON
    error["_id"] = str(error["_id"])
    if "project_id" in error:
        error["project_id"] = str(error["project_id"])

    return error