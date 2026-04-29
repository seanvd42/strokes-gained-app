"""
Authentication API routes
"""
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from supabase import create_client
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter()
supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)


class SignUpRequest(BaseModel):
    email: EmailStr
    password: str
    name: str = None


class SignInRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


@router.post("/signup", response_model=AuthResponse)
async def signup(request: SignUpRequest):
    """
    Register a new user
    """
    try:
        # Sign up with Supabase Auth
        response = supabase.auth.sign_up({
            "email": request.email,
            "password": request.password,
        })
        
        if not response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user"
            )
        
        # Update profile with name if provided
        if request.name and response.session:
            supabase.table("profiles").update({
                "name": request.name
            }).eq("id", response.user.id).execute()
        
        return {
            "access_token": response.session.access_token,
            "token_type": "bearer",
            "user": {
                "id": response.user.id,
                "email": response.user.email,
            }
        }
    
    except Exception as e:
        logger.error(f"Signup error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/signin", response_model=AuthResponse)
async def signin(request: SignInRequest):
    """
    Sign in existing user
    """
    try:
        response = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password,
        })
        
        if not response.user or not response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        return {
            "access_token": response.session.access_token,
            "token_type": "bearer",
            "user": {
                "id": response.user.id,
                "email": response.user.email,
            }
        }
    
    except Exception as e:
        logger.error(f"Signin error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )


@router.post("/signout")
async def signout():
    """
    Sign out current user
    """
    try:
        supabase.auth.sign_out()
        return {"message": "Successfully signed out"}
    except Exception as e:
        logger.error(f"Signout error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to sign out"
        )
