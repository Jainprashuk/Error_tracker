from fastapi import APIRouter, HTTPException, Depends, Header
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from bson import ObjectId
from app.services.db import db, org_members_collection, project_members_collection, users_collection, projects_collection, org_invitations_collection, organizations_collection
from app.routes.auth_routes import verify_token
from app.middleware.org_middleware import verify_org_membership

router = APIRouter(prefix="/members", tags=["Members"])

class AddOrgMemberRequest(BaseModel):
    email: str
    role: str = "viewer"  # admin, dev, viewer

class ChangeMemberRoleRequest(BaseModel):
    user_id: str
    role: str

class AddProjectMemberRequest(BaseModel):
    user_id: str
    project_id: str
    role: str = "viewer"  # dev, viewer

@router.get("/org")
async def list_org_members(
    x_org_id: str = Header(...),
    org_membership: dict = Depends(verify_org_membership(required_permission="ORG_VIEW"))
):
    """List all members of the current organization."""
    memberships = await org_members_collection.find({"org_id": x_org_id}).to_list(length=100)
    
    # Enrich with user details
    enriched_members = []
    for m in memberships:
        user = await users_collection.find_one({"_id": ObjectId(m["user_id"])})
        if user:
            enriched_members.append({
                "user_id": str(user["_id"]),
                "name": user.get("name", "Unknown"),
                "email": user.get("email", ""),
                "role": m.get("role", "viewer"),
                "joined_at": m.get("created_at")
            })
            
    return enriched_members

@router.post("/org/role")
async def update_member_role(
    request: ChangeMemberRoleRequest,
    x_org_id: str = Header(...),
    org_membership: dict = Depends(verify_org_membership(required_permission="ROLE_CHANGE"))
):
    """Update a member's role within the organization."""
    # Prevent users from changing their own role (avoiding accidental lockout)
    if request.user_id == org_membership["user_id"]:
        raise HTTPException(status_code=400, detail="You cannot change your own role.")
        
    result = await org_members_collection.update_one(
        {"org_id": x_org_id, "user_id": request.user_id},
        {"$set": {"role": request.role, "updated_at": datetime.utcnow()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Member not found in this organization.")
        
    return {"message": f"Member role updated to {request.role}."}

@router.post("/org")
async def add_org_member(
    request: AddOrgMemberRequest,
    x_org_id: str = Header(...),
    org_membership: dict = Depends(verify_org_membership(required_permission="ORG_MANAGE"))
):
    """Creates an invitation for a user to join the organization."""
    # Find user by email
    user = await users_collection.find_one({"email": request.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found. They must login to BugTrace at least once.")
        
    user_id = str(user["_id"])
    
    # Check if already a member
    existing = await org_members_collection.find_one({"org_id": x_org_id, "user_id": user_id})
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member of this organization.")
        
    # Check if already invited
    existing_invite = await org_invitations_collection.find_one({
        "org_id": x_org_id, 
        "user_id": user_id,
        "status": "pending"
    })
    if existing_invite:
        raise HTTPException(status_code=400, detail="User has already been invited to this organization.")

    invite_doc = {
        "org_id": x_org_id,
        "user_id": user_id,
        "email": request.email,
        "role": request.role,
        "invited_by": org_membership["user_id"],
        "status": "pending",
        "created_at": datetime.utcnow()
    }
    await org_invitations_collection.insert_one(invite_doc)
    
    return {"message": f"Invitation sent to {request.email}."}

@router.get("/invitations")
async def list_user_invitations(current_user: dict = Depends(verify_token)):
    """List all pending invitations for the current logged-in user."""
    user_id = current_user["user_id"]
    invites = await org_invitations_collection.find({
        "user_id": user_id,
        "status": "pending"
    }).to_list(length=100)
    
    enriched = []
    for invite in invites:
        org = await organizations_collection.find_one({"_id": ObjectId(invite["org_id"])})
        if org:
            enriched.append({
                "invitation_id": str(invite["_id"]),
                "org_name": org["name"],
                "role": invite["role"],
                "invited_at": invite["created_at"]
            })
            
    return enriched

@router.post("/invitations/{invitation_id}/respond")
async def respond_to_invitation(
    invitation_id: str,
    accept: bool,
    current_user: dict = Depends(verify_token)
):
    """Accept or decline an invitation."""
    user_id = current_user["user_id"]
    invite = await org_invitations_collection.find_one({
        "_id": ObjectId(invitation_id),
        "user_id": user_id,
        "status": "pending"
    })
    
    if not invite:
        raise HTTPException(status_code=404, detail="Invitation not found or already processed.")
        
    if accept:
        # 1. Create membership
        member_doc = {
            "org_id": invite["org_id"],
            "user_id": user_id,
            "role": invite["role"],
            "created_at": datetime.utcnow()
        }
        await org_members_collection.insert_one(member_doc)
        
        # 2. Update invite status
        await org_invitations_collection.update_one(
            {"_id": ObjectId(invitation_id)},
            {"$set": {"status": "accepted", "responded_at": datetime.utcnow()}}
        )
    else:
        # Update invite status
        await org_invitations_collection.update_one(
            {"_id": ObjectId(invitation_id)},
            {"$set": {"status": "declined", "responded_at": datetime.utcnow()}}
        )
        
    return {"message": "Invitation " + ("accepted" if accept else "declined")}

@router.get("/org/invitations")
async def list_org_invitations(
    x_org_id: str = Header(...),
    org_membership: dict = Depends(verify_org_membership(allowed_roles=["admin", "dev"]))
):
    """List all invitations sent from this organization."""
    invites = await org_invitations_collection.find({"org_id": x_org_id}).to_list(length=100)
    
    enriched = []
    for invite in invites:
        user = await users_collection.find_one({"_id": ObjectId(invite["user_id"])})
        if user:
            enriched.append({
                "invitation_id": str(invite["_id"]),
                "email": invite["email"],
                "role": invite["role"],
                "status": invite["status"],
                "created_at": invite["created_at"],
                "responded_at": invite.get("responded_at"),
                "user_name": user.get("name", "Unknown")
            })
            
    return enriched

@router.get("/project/{project_id}")
async def list_project_members(
    project_id: str,
    x_org_id: str = Header(...),
    org_membership: dict = Depends(verify_org_membership(required_permission="PROJECT_VIEW"))
):
    """List all members specifically assigned to a project."""
    memberships = await project_members_collection.find({"project_id": project_id}).to_list(length=100)
    
    enriched_members = []
    for m in memberships:
        user = await users_collection.find_one({"_id": ObjectId(m["user_id"])})
        if user:
            enriched_members.append({
                "user_id": str(user["_id"]),
                "name": user.get("name", "Unknown"),
                "email": user.get("email", ""),
                "role": m.get("role", "viewer")
            })
            
    return enriched_members

@router.post("/project")
async def add_project_member(
    request: AddProjectMemberRequest,
    x_org_id: str = Header(...),
    org_membership: dict = Depends(verify_org_membership(required_permission="TEAM_MANAGE"))
):
    """Assign a user from the organization to a specific project with a specific role."""
    # ... logic stays same ...
    project = await projects_collection.find_one({"_id": ObjectId(request.project_id), "org_id": ObjectId(x_org_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found in this organization.")
        
    is_org_member = await org_members_collection.find_one({"org_id": x_org_id, "user_id": request.user_id})
    if not is_org_member:
        raise HTTPException(status_code=400, detail="User must be a member of the organization first.")
        
    await project_members_collection.update_one(
        {"project_id": request.project_id, "user_id": request.user_id},
        {
            "$set": {
                "role": request.role,
                "updated_at": datetime.utcnow()
            },
            "$setOnInsert": {
                "created_at": datetime.utcnow()
            }
        },
        upsert=True
    )
    
    return {"message": "User assigned to project with role: " + request.role}

@router.delete("/project/{project_id}/{user_id}")
async def remove_project_member(
    project_id: str,
    user_id: str,
    x_org_id: str = Header(...),
    org_membership: dict = Depends(verify_org_membership(required_permission="TEAM_MANAGE"))
):
    """Unassign a user from a project."""
    await project_members_collection.delete_one({"project_id": project_id, "user_id": user_id})
    return {"message": "User unassigned from project."}

@router.delete("/org/{user_id}")
async def remove_org_member(
    user_id: str,
    x_org_id: str = Header(...),
    org_membership: dict = Depends(verify_org_membership(required_permission="MEMBER_REMOVE"))
):
    """Remove a member from the organization."""
    if user_id == org_membership["user_id"]:
        raise HTTPException(status_code=400, detail="You cannot remove yourself.")
        
    # 1. Remove from organization
    await org_members_collection.delete_one({"org_id": x_org_id, "user_id": user_id})
    
    # 2. Cleanup: Remove from all projects in this organization
    projects = await projects_collection.find({"org_id": ObjectId(x_org_id)}).to_list(length=1000)
    project_ids = [str(p["_id"]) for p in projects]
    if project_ids:
        await project_members_collection.delete_many({
            "user_id": user_id, 
            "project_id": {"$in": project_ids}
        })
        
    return {"message": "Member removed from organization and all projects."}
