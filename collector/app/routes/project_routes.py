from fastapi import APIRouter
from datetime import datetime
from app.models.project_model import CreateProject
from app.services.db import db
from app.utils.api_key import generate_api_key
from bson import ObjectId
from app.utils.encryption import decrypt_data, encrypt_data

router = APIRouter()

projects_collection = db["projects"]



@router.post("/projects")
def create_project(project: CreateProject):

    api_key = generate_api_key()

    data = {
        "name": project.name,
        "user_id": ObjectId(project.user_id),
        "api_key": api_key,
        "created_at": datetime.utcnow()
    }

    result = projects_collection.insert_one(data)

    return {
        "project_id": str(result.inserted_id),
        "api_key": api_key
    }

@router.get("/projects/{user_id}")
def get_user_projects(user_id: str):

    projects = list(
        projects_collection.find(
            {"user_id": ObjectId(user_id)}
        )
    )

    for p in projects:
        p["_id"] = str(p["_id"])
        p["user_id"] = str(p["user_id"])
        
        # We decrypt from whatever format it is in the DB (Fernet or AES)
        # and RE-ENCRYPT for the frontend specifically using the new format.
        # This keeps the API key encrypted in transit but ensures the FE can decrypt it.
        try:
            if p.get("integrations") and p["integrations"].get("openproject"):
                op = p["integrations"]["openproject"]
                if op.get("api_key"):
                    raw_key = decrypt_data(op["api_key"])
                    op["api_key"] = encrypt_data(raw_key) # Now always uses new AES format
        except Exception:
            pass


    return projects

@router.get("/projects")
def list_projects():

    projects = list(
        projects_collection.find({}, {"_id": 1, "name": 1, "api_key": 1})
    )

    for p in projects:
        p["_id"] = str(p["_id"])

    return projects

@router.get("/projects/{project_id}/errors")
def get_project_errors(project_id: str):

    errors = list(
        errors_collection.find({
            "project_id": ObjectId(project_id)
        })
    )

    for e in errors:
        e["_id"] = str(e["_id"])
        e["project_id"] = str(e["project_id"])

    return errors