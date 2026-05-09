from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from bson import ObjectId
from app.services.db import (
    organizations_collection, users_collection, projects_collection, 
    events_collection, roles_collection, org_members_collection, 
    project_members_collection
)
from app.routes.auth_routes import verify_token

router = APIRouter(prefix="/admin", tags=["SuperAdmin"])

def verify_superadmin(current_user: dict = Depends(verify_token)):
    # 👑 Hardcoded Super Admin check
    SUPER_ADMIN_EMAILS = ["29jainprashuk@gmail.com"]
    if current_user.get("email") not in SUPER_ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Access denied. SuperAdmin privileges required.")
    return current_user

# ─── MODELS ───
class RoleUpdateRequest(BaseModel):
    name: str
    permissions: List[str]
    description: Optional[str] = None

class OrgMemberRoleRequest(BaseModel):
    user_id: str
    role: str

class ProjectMemberRoleRequest(BaseModel):
    user_id: str
    role: str

# ─── HELPERS ───
def stringify(doc):
    if not doc: return doc
    if "_id" in doc: doc["_id"] = str(doc["_id"])
    if "org_id" in doc: doc["org_id"] = str(doc["org_id"])
    if "user_id" in doc: doc["user_id"] = str(doc["user_id"])
    if "project_id" in doc: doc["project_id"] = str(doc["project_id"])
    return doc

# ─── ROUTES ───

@router.get("/stats")
async def get_system_stats(admin: dict = Depends(verify_superadmin)):
    return {
        "orgs": await organizations_collection.count_documents({}),
        "users": await users_collection.count_documents({}),
        "projects": await projects_collection.count_documents({}),
        "total_events": await events_collection.count_documents({})
    }

@router.get("/roles")
async def list_all_roles(admin: dict = Depends(verify_superadmin)):
    roles = await roles_collection.find({}).to_list(length=100)
    if not roles:
        defaults = [
            {"name": "admin", "permissions": ["*"], "description": "Full access."},
            {"name": "dev", "permissions": ["ORG_VIEW", "PROJECT_VIEW", "PROJECT_CREATE", "ERROR_VIEW", "ERROR_RESOLVE", "API_KEY_VIEW", "INTEGRATIONS_MANAGE"], "description": "Dev."},
            {"name": "viewer", "permissions": ["ORG_VIEW", "PROJECT_VIEW", "ERROR_VIEW"], "description": "Viewer."}
        ]
        await roles_collection.insert_many(defaults)
        roles = await roles_collection.find({}).to_list(length=100)
    return [stringify(r) for r in roles]

@router.post("/roles")
async def update_role(request: RoleUpdateRequest, admin: dict = Depends(verify_superadmin)):
    await roles_collection.update_one(
        {"name": request.name},
        {"$set": {
            "permissions": request.permissions,
            "description": request.description
        }},
        upsert=True
    )
    from app.middleware.org_middleware import ROLE_CACHE
    if request.name in ROLE_CACHE:
        del ROLE_CACHE[request.name]
    return {"message": "Role updated"}

@router.get("/orgs")
async def list_all_orgs(admin: dict = Depends(verify_superadmin)):
    orgs = await organizations_collection.find({}).to_list(length=1000)
    return [stringify(o) for o in orgs]

@router.get("/org/{org_id}/members")
async def list_org_members_admin(org_id: str, admin: dict = Depends(verify_superadmin)):
    memberships = await org_members_collection.find({"org_id": org_id}).to_list(length=100)
    enriched = []
    for m in memberships:
        user = await users_collection.find_one({"_id": ObjectId(m["user_id"])})
        if user:
            enriched.append({
                "user_id": str(user["_id"]),
                "name": user.get("name", "Unknown"),
                "email": user.get("email", ""),
                "role": m.get("role", "viewer")
            })
    return enriched

@router.post("/org/{org_id}/member-role")
async def update_org_member_role_admin(org_id: str, request: OrgMemberRoleRequest, admin: dict = Depends(verify_superadmin)):
    await org_members_collection.update_one(
        {"org_id": org_id, "user_id": request.user_id},
        {"$set": {"role": request.role, "updated_at": datetime.utcnow()}}
    )
    return {"message": "Org member role updated"}

@router.get("/org/{org_id}/projects")
async def list_org_projects_admin(org_id: str, admin: dict = Depends(verify_superadmin)):
    projects = await projects_collection.find({"org_id": ObjectId(org_id)}).to_list(length=100)
    return [stringify(p) for p in projects]

@router.get("/project/{project_id}/members")
async def list_project_members_admin(project_id: str, admin: dict = Depends(verify_superadmin)):
    memberships = await project_members_collection.find({"project_id": project_id}).to_list(length=100)
    enriched = []
    for m in memberships:
        user = await users_collection.find_one({"_id": ObjectId(m["user_id"])})
        if user:
            enriched.append({
                "user_id": str(user["_id"]),
                "name": user.get("name", "Unknown"),
                "role": m.get("role", "viewer")
            })
    return enriched

@router.post("/project/{project_id}/member-role")
async def update_project_member_role_admin(project_id: str, request: ProjectMemberRoleRequest, admin: dict = Depends(verify_superadmin)):
    await project_members_collection.update_one(
        {"project_id": project_id, "user_id": request.user_id},
        {"$set": {"role": request.role}}
    )
    return {"message": "Project member role updated"}
