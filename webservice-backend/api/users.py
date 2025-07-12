from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from utils.db import get_database
import bcrypt
import uuid
import os
import jwt
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/users")

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-super-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

# Security scheme for protected routes
security = HTTPBearer()

# Pydantic models for request/response
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    username_or_email: str
    password: str

class UserDelete(BaseModel):
    username: str
 
class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    robots: List[str]

class LoginResponse(BaseModel):
    message: str
    user: UserResponse
    token: str  # Added token field

class TokenData(BaseModel):
    user_id: Optional[str] = None
    username: Optional[str] = None

# JWT helper functions
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str):
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        username: str = payload.get("username")
        
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return TokenData(user_id=user_id, username=username)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Dependency to get current authenticated user"""
    token = credentials.credentials
    token_data = verify_token(token)
    
    db = get_database()
    try:
        user_result = db.table("users").select("*").eq("id", token_data.user_id).execute()
        
        if not user_result.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user = user_result.data[0]
        return UserResponse(
            id=user["id"],
            username=user["username"],
            email=user["email"],
            robots=user["robots"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

# Password helper functions
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def check_user_exists(username: str = None, email: str = None) -> bool:
    db = get_database()

    try:
        if username:
            result = db.table("users").select("id").eq("username", username).execute()
            if result.data:
                return True
        if email:
            result = db.table("users").select("id").eq("email", email).execute()
            if result.data:
                return True
        return False
    except Exception:
        return False

@router.post("/create", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_account(user_data: UserCreate):
    db = get_database()

    if check_user_exists(username=user_data.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    
    # Check if email already exists
    if check_user_exists(email=user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists"
        )
    
    try:
        # Generate UUID for new user
        user_id = str(uuid.uuid4())
        
        # Hash the password
        hashed_password = hash_password(user_data.password)
        
        # Create user in database
        new_user = {
            "id": user_id,
            "username": user_data.username,
            "email": user_data.email,
            "password": hashed_password,
            "robots": []  # init empty robots array
        }
        
        result = db.table("users").insert(new_user).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user account"
            )
        
        created_user = result.data[0]
        return UserResponse(
            id=created_user["id"],
            username=created_user["username"],
            email=created_user["email"],
            robots=created_user["robots"]
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating account: {str(e)}"
        )

@router.post("/login", response_model=LoginResponse)
async def login(login_data: UserLogin):
    db = get_database()
    
    try:
        user_result = None
        
        if "@" in login_data.username_or_email:
            user_result = db.table("users").select("*").eq("email", login_data.username_or_email).execute()
        else:
            user_result = db.table("users").select("*").eq("username", login_data.username_or_email).execute()
        
        if not user_result.data and "@" not in login_data.username_or_email:
            user_result = db.table("users").select("*").eq("email", login_data.username_or_email).execute()
        
        if not user_result.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username/email or password"
            )
        
        user = user_result.data[0]
        
        if not verify_password(login_data.password, user["password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username/email or password"
            )
        
        # Create JWT token
        access_token_expires = timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
        access_token = create_access_token(
            data={"sub": user["id"], "username": user["username"]},
            expires_delta=access_token_expires
        )
        
        return LoginResponse(
            message="Login successful",
            user=UserResponse(
                id=user["id"],
                username=user["username"],
                email=user["email"],
                robots=user["robots"]
            ),
            token=access_token  # Return the JWT token
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login error: {str(e)}"
        )

@router.delete("/delete")
async def delete_account(delete_data: UserDelete, current_user: UserResponse = Depends(get_current_user)):
    """Delete user account (requires authentication)"""
    db = get_database()
    
    try:
        # Check if the authenticated user is trying to delete their own account
        if current_user.username != delete_data.username:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete your own account"
            )
        
        delete_result = db.table("users").delete().eq("username", delete_data.username).execute()
        
        if not delete_result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete user account"
            )
        
        return {"message": f"User '{delete_data.username}' successfully deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting account: {str(e)}"
        )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: UserResponse = Depends(get_current_user)):
    """Get current authenticated user's information"""
    return current_user

@router.get("/check-username/{username}")
async def check_username_availability(username: str):
    """Check if username is available"""
    is_taken = check_user_exists(username=username)
    return {"username": username, "available": not is_taken}

@router.get("/check-email/{email}")
async def check_email_availability(email: str):
    """Check if email is available"""
    is_taken = check_user_exists(email=email)
    return {"email": email, "available": not is_taken}

@router.put("/refresh-token", response_model=dict)
async def refresh_token(current_user: UserResponse = Depends(get_current_user)):
    """Refresh JWT token for authenticated user"""
    access_token_expires = timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    access_token = create_access_token(
        data={"sub": current_user.id, "username": current_user.username},
        expires_delta=access_token_expires
    )
    
    return {
        "message": "Token refreshed successfully",
        "token": access_token
    }