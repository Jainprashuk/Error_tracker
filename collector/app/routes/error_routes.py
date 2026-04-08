from fastapi import APIRouter, Request, HTTPException
from app.models.error_model import ErrorPayload
from app.services.ticket_service import ParseError
from app.services.db import db
from app.services.db import errors_collection
from bson import ObjectId
import json

router = APIRouter()

projects_collection = db["projects"]


@router.post("/report")
async def report_error(payload: ErrorPayload, request: Request):

    raw_body = await request.json()

    payload_dict = payload.model_dump()

    api_key = request.headers.get("x-api-key")

    if not api_key:
        raise HTTPException(status_code=401, detail="API key missing")

    project = projects_collection.find_one({"api_key": api_key})

    if not project:
        raise HTTPException(status_code=401, detail="Invalid API key")

    # 🔥 Pass dict instead of model (flexible parsing)
    await ParseError(payload_dict, project["_id"])

    return {"status": "received"}

# GET all errors of a project
@router.get("/projects/{project_id}/errors")
def get_project_errors(project_id: str):

    errors = list(
        errors_collection.find(
            {"project_id": ObjectId(project_id)},
            {
                "_id": 0,
                "fingerprint": 1,
                "event_type": 1,
                "occurrences": 1,
                "first_seen": 1,
                "last_seen": 1,
                "location": 1,
                "is_ticket_generated": 1  ,# <-- include ticket flag,
                "ticket_url": 1  # <-- include ticket URL
            }
        )
    )

    return errors


# GET error details
@router.get("/errors/{fingerprint}")
def get_error_detail(fingerprint: str):

    error = errors_collection.find_one({"fingerprint": fingerprint})

    if not error:
        raise HTTPException(status_code=404, detail="Error not found")

    # Convert ObjectId → string
    error["_id"] = str(error["_id"])

    if "project_id" in error:
        error["project_id"] = str(error["project_id"])

    return error