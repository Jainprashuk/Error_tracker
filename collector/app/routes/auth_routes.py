from fastapi import APIRouter, HTTPException, Depends, Header
from datetime import datetime, timedelta
from pydantic import BaseModel
import jwt
import os
from typing import Optional
from bson import ObjectId
from app.services.db import users_collection


router = APIRouter()

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = int(os.getenv("ACCESS_TOKEN_EXPIRE_HOURS", "24"))


class LoginRequest(BaseModel):
    email: str
    password: str
    name: Optional[str] = None


class LoginResponse(BaseModel):
    user_id: str
    email: str
    name: str
    token: str

class User(BaseModel):
    id: str
    email: str
    name: str

class ClerkSyncRequest(BaseModel):
    clerk_id: str
    email: str
    name: str


def create_access_token(user_id: str, email: str, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token"""
    if expires_delta is None:
        expires_delta = timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    
    expire = datetime.utcnow() + expires_delta
    to_encode = {
        "user_id": user_id,
        "email": email,
        "exp": expire,
        "iat": datetime.utcnow()
    }
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(authorization: Optional[str] = Header(None)):
    """Verify JWT token from request header"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    
    # Extract token from "Bearer <token>" format
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = parts[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("user_id")
        email: str = payload.get("email")
        
        if user_id is None or email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        return {"user_id": user_id, "email": email}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.post("/auth/clerk-sync", response_model=LoginResponse)
async def sync_clerk_user(request: ClerkSyncRequest):
    """
    Synchronizes an authenticated Clerk OAuth user into the local MongoDB instance.
    """
    try:
        email = request.email.lower().strip()
        name = request.name or email.split("@")[0]
        
        # 💡 P1: Await async lookup
        existing_user = await users_collection.find_one({"email": email})
        
        if not existing_user:
            # First time logging in
            user_doc = {
                "clerk_id": request.clerk_id,
                "email": email,
                "name": name,
                "created_at": datetime.utcnow()
            }
            result = await users_collection.insert_one(user_doc)
            user_id = str(result.inserted_id)
            
            # --- MULTI-TENANT: Auto-create Org & Membership ---
            from app.services.db import organizations_collection, org_members_collection
            import re
            
            org_name = f"{name}'s Org"
            slug = re.sub(r'[^a-z0-9]+', '-', org_name.lower()).strip('-')
            org_doc = {
                "name": org_name,
                "slug": slug,
                "owner_id": user_id,
                "logo_url": None,
                "created_at": datetime.utcnow()
            }
            org_result = await organizations_collection.insert_one(org_doc)
            
            member_doc = {
                "org_id": str(org_result.inserted_id),
                "user_id": user_id,
                "role": "admin",
                "created_at": datetime.utcnow()
            }
            await org_members_collection.insert_one(member_doc)
            
        else:
            # Update existing user
            await users_collection.update_one(
                {"_id": existing_user["_id"]}, 
                {"$set": {"clerk_id": request.clerk_id, "name": name}}
            )
            user_id = str(existing_user["_id"])
            
        # Create access token
        token = create_access_token(user_id=user_id, email=email)
        
        return LoginResponse(
            user_id=user_id,
            email=email,
            name=name,
            token=token
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/auth/verify", response_model=User)
async def verify_auth(current_user: dict = Depends(verify_token)):
    """
    Verify the current JWT token and return user info.
    """
    # 💡 P1: Await async lookup (ObjectId convert needed if current_user['user_id'] is string)
    user = await users_collection.find_one({"_id": ObjectId(current_user["user_id"])})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return User(
        id=str(user["_id"]),
        email=user["email"],
        name=user.get("name", "")
    )