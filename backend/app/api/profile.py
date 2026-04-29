"""
Profile API routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from app.models.schemas import Profile, ProfileUpdate
from app.services.database import db_service
from app.core.auth import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/me", response_model=Profile)
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    """
    Get current user's profile
    """
    try:
        profile = await db_service.get_profile(current_user["id"])
        
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found"
            )
        
        return profile
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve profile"
        )


@router.put("/me", response_model=Profile)
async def update_my_profile(
    updates: ProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update current user's profile
    """
    try:
        # Only update fields that are provided
        update_data = updates.model_dump(exclude_unset=True)
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
        profile = await db_service.update_profile(current_user["id"], update_data)
        return profile
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile"
        )
