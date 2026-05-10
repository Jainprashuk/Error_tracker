from fastapi import APIRouter, HTTPException, Depends, Header, BackgroundTasks
from datetime import datetime, timedelta
from pydantic import BaseModel
import jwt
import os
from typing import Optional
from bson import ObjectId
from app.services.db import users_collection
from app.services.email_service import send_lifecycle_email

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
async def sync_clerk_user(request: ClerkSyncRequest, bg_tasks: BackgroundTasks):
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
            
            # --- LIFECYCLE: Dispatch Welcome Email ---
            welcome_html = f"""
            <!DOCTYPE html>
            <html>
            <body style="margin: 0; padding: 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">

                    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%); padding: 32px 20px; text-align: center;">
                        <div style="display: inline-block; background: rgba(59,130,246,0.2); border: 1px solid rgba(59,130,246,0.4); border-radius: 999px; padding: 5px 14px; margin-bottom: 18px;">
                            <span style="color: #93c5fd; font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;">Welcome to BugTrace</span>
                        </div>
                        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; line-height: 1.2;">Hi {name}, glad<br>you're here! 👋</h1>
                        <p style="color: #94a3b8; font-size: 14px; margin-top: 12px; line-height: 1.6; margin-bottom: 0;">Your workspace <strong style="color: #e2e8f0;">{org_name}</strong> is live. Let's start catching bugs.</p>
                    </div>

                    <div style="padding: 24px 20px;">
                        <p style="color: #475569; font-size: 14px; line-height: 1.7; margin-top: 0;">
                            BugTrace helps you catch, diagnose, and resolve errors in real-time — before your users ever notice. Here's how to get started:
                        </p>

                        <div style="margin: 20px 0;">
                            <div style="margin-bottom: 12px; padding: 14px 16px; background: #f8fafc; border-radius: 10px; border-left: 3px solid #3b82f6;">
                                <p style="margin: 0; font-weight: 700; color: #0f172a; font-size: 13px;">① Create a Project</p>
                                <p style="margin: 3px 0 0; color: #64748b; font-size: 12px;">Each app or service gets its own isolated monitoring workspace.</p>
                            </div>
                            <div style="margin-bottom: 12px; padding: 14px 16px; background: #f8fafc; border-radius: 10px; border-left: 3px solid #3b82f6;">
                                <p style="margin: 0; font-weight: 700; color: #0f172a; font-size: 13px;">② Install the SDK</p>
                                <p style="margin: 3px 0 0; color: #64748b; font-size: 12px;">One line of code. Works with Node.js, Python, React, and more.</p>
                            </div>
                            <div style="padding: 14px 16px; background: #f8fafc; border-radius: 10px; border-left: 3px solid #3b82f6;">
                                <p style="margin: 0; font-weight: 700; color: #0f172a; font-size: 13px;">③ Watch Errors Stream In</p>
                                <p style="margin: 3px 0 0; color: #64748b; font-size: 12px;">Real-time error feeds, stack traces, and user context in one dashboard.</p>
                            </div>
                        </div>

                        <div style="text-align: center; margin: 28px 0 16px;">
                            <a href="https://bugtrace.jainprashuk.in/" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 13px 32px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 14px rgba(59,130,246,0.4);">Open Dashboard →</a>
                        </div>

                        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 20px; margin-bottom: 0;">
                            Happy debugging,<br><strong style="color: #64748b;">The BugTrace Team</strong>
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
                [email], 
                "🚀 Welcome to BugTrace - Let's crush some bugs!", 
                welcome_html
            )
            
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