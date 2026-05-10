from fastapi import HTTPException, Depends, Header
from app.services.db import org_members_collection, project_members_collection, roles_collection
from app.routes.auth_routes import verify_token
import time

# 🚀 In-memory cache for roles to prevent DB thrashing
ROLE_CACHE = {}
CACHE_TTL = 60 # 1 minute

async def get_role_permissions(role_name: str) -> list:
    """Fetches permissions for a role from the DB or Cache."""
    now = time.time()
    if role_name in ROLE_CACHE:
        cache_data, expiry = ROLE_CACHE[role_name]
        if now < expiry:
            return cache_data
            
    # Fallback to DB
    role_doc = await roles_collection.find_one({"name": role_name})
    perms = role_doc.get("permissions", []) if role_doc else []
    
    # 💡 Default safety net for development
    if not perms:
        if role_name == "admin": perms = ["*"]
        elif role_name == "dev": perms = ["ORG_VIEW", "PROJECT_VIEW", "PROJECT_CREATE", "ERROR_VIEW", "ERROR_RESOLVE", "PERFORMANCE_VIEW", "API_KEY_VIEW", "INTEGRATIONS_MANAGE"]
        elif role_name == "viewer": perms = ["ORG_VIEW", "PROJECT_VIEW", "ERROR_VIEW", "PERFORMANCE_VIEW"]

    ROLE_CACHE[role_name] = (perms, now + CACHE_TTL)
    return perms

async def check_permission(user_role: str, required_permission: str) -> bool:
    """Helper to verify if a role has a specific capability."""
    perms = await get_role_permissions(user_role)
    return "*" in perms or required_permission in perms

def verify_org_membership(required_permission: str = None, allowed_roles: list = None):
    """
    Middleware to verify user's permissions within an organization.
    Supports legacy role-based checks and new permission-based checks.
    """
    async def permission_checker(
        x_org_id: str = Header(...), 
        project_id: str = None, # Optional: For checking project-specific role overrides
        current_user: dict = Depends(verify_token)
    ):
        if not x_org_id or len(x_org_id) != 24:
            raise HTTPException(status_code=400, detail="Invalid x-org-id format")
            
        user_id = current_user.get("user_id")
        
        # 1. Get Global Org Membership
        member = await org_members_collection.find_one({
            "org_id": x_org_id,
            "user_id": user_id
        })
        
        if not member:
            raise HTTPException(status_code=403, detail="Forbidden. Not a member of this organization.")
            
        user_role = member.get("role", "viewer")

        # 2. Check for Project-Specific Role Override
        # If we are performing an action on a specific project, check if this user has a special role there.
        if project_id:
            proj_member = await project_members_collection.find_one({
                "project_id": project_id,
                "user_id": user_id
            })
            # Project role overrides Org role (unless Org role is admin)
            if proj_member and user_role != "admin":
                user_role = proj_member.get("role", user_role)

        # 3. Verify Permissions
        if required_permission:
            permission_ok = await check_permission(user_role, required_permission)
            if not permission_ok:
                raise HTTPException(status_code=403, detail=f"Missing capability: {required_permission}")
        
        # Legacy support for role lists
        if allowed_roles and user_role not in allowed_roles:
            if user_role != "admin": # Admin bypasses role lists
                raise HTTPException(status_code=403, detail="Insufficient role permissions.")
            
        member["_id"] = str(member["_id"])
        member["effective_role"] = user_role
        return member 

    return permission_checker

