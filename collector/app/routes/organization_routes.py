from fastapi import APIRouter, HTTPException, Depends, Header
from typing import List
from datetime import datetime
from bson import ObjectId
from app.services.db import organizations_collection, org_members_collection
from app.routes.auth_routes import verify_token
import re

router = APIRouter(prefix="/orgs", tags=["Organizations"])

@router.get("/")
async def list_user_orgs(current_user: dict = Depends(verify_token)):
    user_id = current_user["user_id"]
    
    # Find memberships
    memberships = await org_members_collection.find({"user_id": user_id}).to_list(length=100)
    if not memberships:
        return []
        
    org_ids = [ObjectId(m["org_id"]) for m in memberships]
    
    # Find org details
    orgs = await organizations_collection.find({"_id": {"$in": org_ids}}).to_list(length=100)
    
    response = []
    for org in orgs:
        # Match membership role
        role = next((m["role"] for m in memberships if str(m["org_id"]) == str(org["_id"])), "viewer")
        response.append({
            "_id": str(org["_id"]),
            "name": org["name"],
            "slug": org.get("slug"),
            "logo_url": org.get("logo_url"),
            "my_role": role
        })
        
    return response

from pydantic import BaseModel
class CreateOrgRequest(BaseModel):
    name: str

@router.post("/")
async def create_organization(request: CreateOrgRequest, current_user: dict = Depends(verify_token)):
    user_id = current_user["user_id"]
    
    slug = re.sub(r'[^a-z0-9]+', '-', request.name.lower()).strip('-')
    
    org_doc = {
        "name": request.name,
        "slug": slug,
        "owner_id": user_id,
        "created_at": datetime.utcnow()
    }
    
    org_result = await organizations_collection.insert_one(org_doc)
    org_id_str = str(org_result.inserted_id)
    
    member_doc = {
        "org_id": org_id_str,
        "user_id": user_id,
        "role": "admin",
        "created_at": datetime.utcnow()
    }
    await org_members_collection.insert_one(member_doc)
    
    return {
        "_id": org_id_str,
        "name": request.name,
        "slug": slug,
        "my_role": "admin"
    }
