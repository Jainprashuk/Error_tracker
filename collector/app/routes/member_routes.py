from fastapi import APIRouter, HTTPException, Depends, Header, BackgroundTasks
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from bson import ObjectId
from app.services.db import db, org_members_collection, project_members_collection, users_collection, projects_collection, org_invitations_collection, organizations_collection
from app.routes.auth_routes import verify_token
from app.middleware.org_middleware import verify_org_membership, ensure_project_access
from app.services.email_service import send_lifecycle_email

router = APIRouter(prefix="/members", tags=["Members"])

class ProjectGrant(BaseModel):
    project_id: str
    role: str = "viewer"  # dev, viewer

class AddOrgMemberRequest(BaseModel):
    email: str
    role: str = "viewer"  # admin, dev, viewer (baseline org role)
    # When restricted=True the member gets NO org-wide project visibility;
    # they can only see/access the projects listed in `projects`.
    restricted: bool = False
    projects: List[ProjectGrant] = []

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
    bg_tasks: BackgroundTasks,
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

    # Validate & normalize per-project grants (for restricted invites).
    # Only projects that actually belong to this org are accepted.
    project_grants = []
    if request.restricted:
        if not request.projects:
            raise HTTPException(status_code=400, detail="Restricted invites must grant access to at least one project.")
        for grant in request.projects:
            try:
                proj_oid = ObjectId(grant.project_id)
            except Exception:
                raise HTTPException(status_code=400, detail=f"Invalid project id: {grant.project_id}")
            proj = await projects_collection.find_one({"_id": proj_oid, "org_id": ObjectId(x_org_id)})
            if not proj:
                raise HTTPException(status_code=400, detail="One or more projects do not belong to this organization.")
            project_grants.append({"project_id": grant.project_id, "role": grant.role})

    invite_doc = {
        "org_id": x_org_id,
        "user_id": user_id,
        "email": request.email,
        # Restricted members get a minimal "viewer" baseline; their real access
        # comes from the per-project grants applied on accept.
        "role": "viewer" if request.restricted else request.role,
        "restricted": request.restricted,
        "project_grants": project_grants,
        "invited_by": org_membership["user_id"],
        "status": "pending",
        "created_at": datetime.utcnow()
    }
    await org_invitations_collection.insert_one(invite_doc)

    # --- Dispatch invitation email (best-effort, non-blocking) ---
    org = await organizations_collection.find_one({"_id": ObjectId(x_org_id)})
    org_name = org.get("name", "an organization") if org else "an organization"

    inviter = await users_collection.find_one({"_id": ObjectId(org_membership["user_id"])})
    inviter_name = (inviter.get("name") or inviter.get("email", "A teammate")) if inviter else "A teammate"

    invitee_name = user.get("name") or request.email.split("@")[0]

    invite_html = f"""
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">

            <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%); padding: 32px 20px; text-align: center;">
                <div style="display: inline-block; background: rgba(59,130,246,0.2); border: 1px solid rgba(59,130,246,0.4); border-radius: 999px; padding: 5px 14px; margin-bottom: 18px;">
                    <span style="color: #93c5fd; font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;">Team Invitation</span>
                </div>
                <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; line-height: 1.3;">You're invited to<br>join {org_name} 🎉</h1>
                <p style="color: #94a3b8; font-size: 14px; margin-top: 12px; line-height: 1.6; margin-bottom: 0;"><strong style="color: #e2e8f0;">{inviter_name}</strong> has invited you to collaborate on BugTrace.</p>
            </div>

            <div style="padding: 24px 20px;">
                <p style="color: #475569; font-size: 14px; line-height: 1.7; margin-top: 0;">
                    Hi {invitee_name}, you've been invited to join <strong style="color: #0f172a;">{org_name}</strong> as a <strong style="color: #0f172a;">{request.role}</strong>.
                </p>

                <div style="margin: 20px 0; padding: 14px 16px; background: #f8fafc; border-radius: 10px; border-left: 3px solid #3b82f6;">
                    <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.6;">
                        Open your BugTrace dashboard and head to <strong style="color: #0f172a;">Pending Invitations</strong> to accept or decline this invite.
                    </p>
                </div>

                <div style="text-align: center; margin: 28px 0 16px;">
                    <a href="https://bugtrace.jainprashuk.in/" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 13px 32px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 14px rgba(59,130,246,0.4);">Review Invitation →</a>
                </div>

                <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 20px; margin-bottom: 0;">
                    If you weren't expecting this, you can safely ignore this email.
                </p>
            </div>

            <div style="background: #f8fafc; padding: 14px 20px; border-top: 1px solid #e2e8f0; text-align: center;">
                <p style="color: #94a3b8; font-size: 11px; margin: 0;">© 2025 BugTrace · bugtrace.jainprashuk.in</p>
            </div>
        </div>
    </body>
    </html>
    """
    bg_tasks.add_task(
        send_lifecycle_email,
        [request.email],
        f"🎉 {inviter_name} invited you to join {org_name} on BugTrace",
        invite_html,
        "invitation"
    )

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
        # 1. Create membership (carry the restricted flag through from the invite)
        is_restricted = bool(invite.get("restricted"))
        member_doc = {
            "org_id": invite["org_id"],
            "user_id": user_id,
            "role": invite["role"],
            "restricted": is_restricted,
            "created_at": datetime.utcnow()
        }
        await org_members_collection.insert_one(member_doc)

        # 1b. For restricted members, materialize the per-project access grants
        for grant in invite.get("project_grants", []):
            await project_members_collection.update_one(
                {"project_id": grant["project_id"], "user_id": user_id},
                {"$set": {"role": grant.get("role", "viewer"), "updated_at": datetime.utcnow()},
                 "$setOnInsert": {"created_at": datetime.utcnow()}},
                upsert=True
            )

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

@router.delete("/org/invitations/{invitation_id}")
async def cancel_org_invitation(
    invitation_id: str,
    x_org_id: str = Header(...),
    org_membership: dict = Depends(verify_org_membership(required_permission="ORG_MANAGE"))
):
    """Revoke a pending invitation before it's been accepted or declined."""
    result = await org_invitations_collection.delete_one({
        "_id": ObjectId(invitation_id),
        "org_id": x_org_id,
        "status": "pending"
    })

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pending invitation not found.")

    return {"message": "Invitation cancelled."}

@router.get("/project/{project_id}")
async def list_project_members(
    project_id: str,
    x_org_id: str = Header(...),
    org_membership: dict = Depends(verify_org_membership(required_permission="PROJECT_VIEW"))
):
    """List all members specifically assigned to a project."""
    await ensure_project_access(org_membership, org_membership["user_id"], project_id)
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
