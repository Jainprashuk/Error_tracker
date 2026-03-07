from fastapi import APIRouter, HTTPException, Depends, Header
from datetime import datetime, timedelta
from pydantic import BaseModel
import jwt
import os
from typing import Optional
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


@router.post("/auth/login", response_model=LoginResponse)
def login(request: LoginRequest):
    """
    Login with email and password.
    User must be registered first.
    """
    try:
        email = request.email.lower().strip()
        password = request.password
        
        if not email or not password:
            raise HTTPException(status_code=400, detail="Email and password required")
        
        # Check if user exists
        existing_user = users_collection.find_one({"email": email})
        
        if not existing_user:
            # User doesn't exist - must register first
            raise HTTPException(status_code=401, detail="User not found. Please sign up first.")
        
        # User exists - verify password
        stored_password = existing_user.get("password")
        if stored_password != password:
            raise HTTPException(status_code=401, detail="Invalid password")
        
        user_id = str(existing_user["_id"])
        user_name = existing_user.get("name", email)
        
        # Create JWT token
        token = create_access_token(user_id=user_id, email=email)
        
        return LoginResponse(
            user_id=user_id,
            email=email,
            name=user_name,
            token=token
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/auth/register", response_model=LoginResponse)
def register(request: LoginRequest):
    """
    Register a new user with email and password.
    """
    try:
        email = request.email.lower().strip()
        name = request.name or email.split("@")[0]
        password = request.password
        
        if not email or not password:
            raise HTTPException(status_code=400, detail="Email and password required")
        
        # Check if user already exists
        existing_user = users_collection.find_one({"email": email})
        
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Create new user
        result = users_collection.insert_one({
            "email": email,
            "name": name,
            "password": password,  # In production, hash this with bcrypt!
            "created_at": datetime.utcnow()
        })
        
        user_id = str(result.inserted_id)
        
        # Create JWT token
        token = create_access_token(user_id=user_id, email=email)
        
        return LoginResponse(
            user_id=user_id,
            email=email,
            name=name,
            token=token
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/auth/verify", response_model=User)
def verify_auth(current_user: dict = Depends(verify_token)):
    """
    Verify the current JWT token and return user info.
    """
    user = users_collection.find_one({"_id": current_user["user_id"]})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return User(
        id=str(user["_id"]),
        email=user["email"],
        name=user.get("name", "")
    )