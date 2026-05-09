from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from datetime import datetime
from app.models.project_model import CreateProject
from app.services.db import db, projects_collection, project_members_collection, errors_collection, events_collection, performance_collection, alerts_config_collection, alerts_logs_collection
from app.utils.api_key import generate_api_key
from bson import ObjectId
from app.utils.encryption import decrypt_data, encrypt_data
from app.middleware.org_middleware import verify_org_membership

router = APIRouter(tags=["Projects"])

@router.post("/projects")
async def create_project(
    project: CreateProject,
    x_org_id: str = Header(...),
    org_membership: dict = Depends(verify_org_membership(required_permission="PROJECT_CREATE"))
):
    api_key = generate_api_key()

    data = {
        "name": project.name,
        "org_id": ObjectId(x_org_id),
        "api_key": api_key,
        "created_at": datetime.utcnow()
    }

    result = await projects_collection.insert_one(data)
    project_id = str(result.inserted_id)

    # Automatically add the creator as an admin of the project
    await project_members_collection.insert_one({
        "project_id": project_id,
        "user_id": org_membership["user_id"],
        "role": "admin",
        "created_at": datetime.utcnow()
    })

    return {
        "project_id": project_id,
        "api_key": api_key,
        "org_id": x_org_id
    }

@router.get("/projects")
async def list_org_projects(
    x_org_id: str = Header(...),
    org_membership: dict = Depends(verify_org_membership(required_permission="PROJECT_VIEW"))
):
    user_id = org_membership["user_id"]
    user_role = org_membership.get("role", "viewer")

    # 1. Base query: must belong to the org
    query = {"org_id": ObjectId(x_org_id)}

    # Cache assigned projects for quick role lookup (to determine user's role within each project)
    role_map = {}
    assigned_docs = await project_members_collection.find({"user_id": user_id}).to_list(length=100)
    for doc in assigned_docs:
        role_map[str(doc["project_id"])] = doc.get("role", "viewer")

    projects = await projects_collection.find(query).to_list(length=100)

    def stringify_doc(doc):
        if isinstance(doc, list):
            return [stringify_doc(x) for x in doc]
        if isinstance(doc, dict):
            return {k: stringify_doc(v) for k, v in doc.items()}
        if isinstance(doc, ObjectId):
            return str(doc)
        return doc

    sanitized_projects = []
    for p in projects:
        try:
            pid_str = str(p["_id"])
            p = stringify_doc(p)
            p["id"] = p.get("_id")
            
            # Determine effective role in this project
            effective_role = "admin" if user_role == "admin" else role_map.get(pid_str, "viewer")
            p["my_project_role"] = effective_role

            # 🔐 P0 SECURITY: Strip API Key if no capability
            from app.middleware.org_middleware import check_permission
            has_api_permission = await check_permission(effective_role, "API_KEY_VIEW")
            if not has_api_permission:
                p["api_key"] = "•••••••••••••••• (Restricted)"

            # Handle integrations
            if p.get("integrations") and isinstance(p["integrations"], dict):
                op = p["integrations"].get("openproject")
                if op and isinstance(op, dict) and op.get("api_key"):
                    try:
                        raw_key = decrypt_data(op["api_key"])
                        op["api_key"] = encrypt_data(raw_key)
                    except:
                        pass
            sanitized_projects.append(p)
        except Exception as e:
            print(f"Error sanitizing project: {e}")
            continue

    return sanitized_projects

class UpdateProjectRequest(BaseModel):
    name: str

@router.patch("/projects/{project_id}")
async def update_project(
    project_id: str,
    request: UpdateProjectRequest,
    x_org_id: str = Header(...),
    org_membership: dict = Depends(verify_org_membership(required_permission="PROJECT_EDIT"))
):
    """
    Updates project metadata. Currently supports renaming.
    Restricted to organization managers with PROJECT_EDIT capability.
    """
    # 1. Verify project belongs to org
    project = await projects_collection.find_one({"_id": ObjectId(project_id), "org_id": ObjectId(x_org_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found in this organization.")

    # 2. Update
    await projects_collection.update_one(
        {"_id": ObjectId(project_id)},
        {"$set": {"name": request.name}}
    )

    return {"message": "Project updated successfully", "name": request.name}

@router.delete("/projects/{project_id}")
async def delete_project(
    project_id: str,
    x_org_id: str = Header(...),
    org_membership: dict = Depends(verify_org_membership(required_permission="PROJECT_DELETE"))
):
    """
    Permanently deletes a project and all its associated data.
    Restricted to organization managers with PROJECT_DELETE capability.
    """
    # 1. Verify project belongs to org
    project = await projects_collection.find_one({"_id": ObjectId(project_id), "org_id": ObjectId(x_org_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found in this organization.")

    # 2. Cleanup all associated data
    await errors_collection.delete_many({"project_id": project_id})
    await events_collection.delete_many({"project_id": project_id})
    await performance_collection.delete_many({"project_id": project_id})
    await project_members_collection.delete_many({"project_id": project_id})
    await alerts_config_collection.delete_many({"project_id": project_id})
    await alerts_logs_collection.delete_many({"project_id": project_id})

    # 3. Final: Delete the project meta doc
    await projects_collection.delete_one({"_id": ObjectId(project_id)})

    return {"message": f"Project '{project.get('name')}' deleted successfully."}