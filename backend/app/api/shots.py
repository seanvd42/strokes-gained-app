"""
Shots API routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import date, datetime
from app.models.schemas import (
    Shot, ShotCreate, BulkShotImport, 
    SummaryMetrics, DashboardData, ShotFilters
)
from app.services.database import db_service
from app.core.auth import get_current_user
from app.core.strokes_gained import StrokesGainedCalculator, calculate_summary_metrics
import pandas as pd
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/", response_model=Shot, status_code=status.HTTP_201_CREATED)
async def create_shot(
    shot: ShotCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a single shot record with strokes gained calculation
    """
    try:
        # Calculate strokes gained if we have the necessary data
        strokes_gained = None
        if shot.raw_data and all(k in shot.raw_data for k in 
                                ["start_distance_to_hole", "end_distance_to_hole", 
                                 "start_position", "end_position"]):
            calculator = StrokesGainedCalculator(shot.benchmark)
            strokes_gained = calculator.calculate_strokes_gained(
                start_distance=shot.raw_data["start_distance_to_hole"],
                start_lie=shot.raw_data["start_position"],
                end_distance=shot.raw_data["end_distance_to_hole"],
                end_lie=shot.raw_data["end_position"]
            )
        
        # Prepare shot data
        shot_data = shot.model_dump()
        shot_data["user_id"] = current_user["id"]
        shot_data["strokes_gained"] = strokes_gained
        
        # Convert date/time to strings for Supabase
        if isinstance(shot_data.get("shot_date"), date):
            shot_data["shot_date"] = shot_data["shot_date"].isoformat()
        if shot_data.get("shot_time"):
            shot_data["shot_time"] = str(shot_data["shot_time"])
        
        created_shot = await db_service.create_shot(shot_data)
        return created_shot
    
    except Exception as e:
        logger.error(f"Error creating shot: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create shot"
        )


@router.post("/bulk", response_model=List[Shot], status_code=status.HTTP_201_CREATED)
async def bulk_import_shots(
    import_data: BulkShotImport,
    current_user: dict = Depends(get_current_user)
):
    """
    Bulk import shots from Garmin or other sources
    """
    try:
        calculator = StrokesGainedCalculator(import_data.benchmark)
        shots_to_create = []
        
        for shot_raw in import_data.shots:
            # Calculate strokes gained
            strokes_gained = None
            if all(k in shot_raw for k in ["start_distance_to_hole", "end_distance_to_hole",
                                          "start_position", "end_position"]):
                strokes_gained = calculator.calculate_strokes_gained(
                    start_distance=shot_raw["start_distance_to_hole"],
                    start_lie=shot_raw["start_position"],
                    end_distance=shot_raw["end_distance_to_hole"],
                    end_lie=shot_raw["end_position"]
                )
            
            shot_data = {
                "user_id": current_user["id"],
                "shot_date": shot_raw.get("shot_date", datetime.now().date().isoformat()),
                "shot_time": shot_raw.get("shot_time"),
                "hole_number": shot_raw.get("hole_number"),
                "shot_number": shot_raw.get("shot_number"),
                "club": shot_raw.get("club"),
                "distance_yards": shot_raw.get("distance"),
                "lie_type": shot_raw.get("start_position"),
                "starting_position": shot_raw.get("start_position"),
                "ending_position": shot_raw.get("end_position"),
                "strokes_gained": strokes_gained,
                "benchmark": import_data.benchmark,
                "raw_data": shot_raw
            }
            shots_to_create.append(shot_data)
        
        created_shots = await db_service.bulk_create_shots(shots_to_create)
        return created_shots
    
    except Exception as e:
        logger.error(f"Error bulk importing shots: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to import shots: {str(e)}"
        )


@router.get("/", response_model=List[Shot])
async def get_shots(
    start_date: Optional[date] = Query(None, description="Filter by start date"),
    end_date: Optional[date] = Query(None, description="Filter by end date"),
    benchmark: Optional[str] = Query(None, description="Filter by benchmark"),
    limit: int = Query(1000, le=5000, description="Maximum number of results"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get shots for current user with optional filters
    """
    try:
        shots = await db_service.get_shots(
            user_id=current_user["id"],
            start_date=start_date,
            end_date=end_date,
            benchmark=benchmark,
            limit=limit
        )
        return shots
    
    except Exception as e:
        logger.error(f"Error getting shots: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve shots"
        )


@router.get("/dashboard", response_model=DashboardData)
async def get_dashboard_data(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    benchmark: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Get dashboard data including shots and summary metrics
    """
    try:
        shots = await db_service.get_shots(
            user_id=current_user["id"],
            start_date=start_date,
            end_date=end_date,
            benchmark=benchmark
        )
        
        # Calculate summary metrics
        if shots:
            df = pd.DataFrame(shots)
            summary = calculate_summary_metrics(df)
        else:
            summary = {
                "total_shots": 0,
                "total_strokes_gained": 0.0,
                "avg_strokes_gained": 0.0,
                "best_shot": 0.0,
                "worst_shot": 0.0,
                "positive_shots": 0,
                "negative_shots": 0
            }
        
        return {
            "shots": shots,
            "summary": summary
        }
    
    except Exception as e:
        logger.error(f"Error getting dashboard data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve dashboard data"
        )


@router.get("/summary", response_model=SummaryMetrics)
async def get_summary_metrics(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    benchmark: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Get summary metrics only
    """
    try:
        shots = await db_service.get_shots(
            user_id=current_user["id"],
            start_date=start_date,
            end_date=end_date,
            benchmark=benchmark
        )
        
        if shots:
            df = pd.DataFrame(shots)
            summary = calculate_summary_metrics(df)
        else:
            summary = {
                "total_shots": 0,
                "total_strokes_gained": 0.0,
                "avg_strokes_gained": 0.0,
                "best_shot": 0.0,
                "worst_shot": 0.0,
                "positive_shots": 0,
                "negative_shots": 0
            }
        
        return summary
    
    except Exception as e:
        logger.error(f"Error getting summary: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to calculate summary"
        )


@router.get("/{shot_id}", response_model=Shot)
async def get_shot(
    shot_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific shot by ID
    """
    try:
        shot = await db_service.get_shot_by_id(shot_id, current_user["id"])
        
        if not shot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Shot not found"
            )
        
        return shot
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting shot: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve shot"
        )


@router.delete("/{shot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_shot(
    shot_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a shot
    """
    try:
        success = await db_service.delete_shot(shot_id, current_user["id"])
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Shot not found"
            )
        
        return None
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting shot: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete shot"
        )


@router.delete("/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_all_shots(current_user: dict = Depends(get_current_user)):
    """
    Delete all shots for current user
    """
    try:
        await db_service.delete_all_shots(current_user["id"])
        return None
    
    except Exception as e:
        logger.error(f"Error deleting all shots: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete shots"
        )
