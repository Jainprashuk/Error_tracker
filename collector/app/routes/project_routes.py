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
async def create_project(project: CreateProject):

    api_key = generate_api_key()

    data = {
        "name": project.name,
        "user_id": ObjectId(project.user_id),
        "api_key": api_key,
        "created_at": datetime.utcnow()
    }

    # 💡 P1: Await async insert
    result = await projects_collection.insert_one(data)

    return {
        "project_id": str(result.inserted_id),
        "api_key": api_key
    }

@router.get("/projects/{user_id}")
async def get_user_projects(user_id: str):

    # 💡 P1: Await async find + to_list
    projects = await projects_collection.find(
        {"user_id": ObjectId(user_id)}
    ).to_list(length=100)

    for p in projects:
        p["_id"] = str(p["_id"])
        p["user_id"] = str(p["user_id"])
        
        try:
            if p.get("integrations") and p["integrations"].get("openproject"):
                op = p["integrations"]["openproject"]
                if op.get("api_key"):
                    raw_key = decrypt_data(op["api_key"])
                    op["api_key"] = encrypt_data(raw_key) 
        except Exception:
            pass

    return projects

@router.get("/projects")
async def list_projects():
    # 💡 P1: Await async find + to_list
    projects = await projects_collection.find({}, {"_id": 1, "name": 1, "api_key": 1}).to_list(length=100)

    for p in projects:
        p["_id"] = str(p["_id"])

    return projects