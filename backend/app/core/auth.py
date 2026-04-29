"""
Authentication and authorization utilities
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from supabase import create_client
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

security = HTTPBearer()

supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """
    Validate JWT token and return current user
    
    Args:
        credentials: HTTP Bearer token from request header
    
    Returns:
        User data dictionary
    
    Raises:
        HTTPException: If token is invalid or expired
    """
    token = credentials.credentials
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Verify token with Supabase
        user = supabase.auth.get_user(token)
        
        if not user or not user.user:
            raise credentials_exception
        
        return {
            "id": user.user.id,
            "email": user.user.email,
        }
    
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise credentials_exception


async def verify_user_access(user_id: str, current_user: dict = Depends(get_current_user)) -> bool:
    """
    Verify that the current user has access to the specified user_id resources
    
    Args:
        user_id: User ID to check access for
        current_user: Current authenticated user
    
    Returns:
        True if access is allowed
    
    Raises:
        HTTPException: If access is denied
    """
    if current_user["id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this resource"
        )
    return True
