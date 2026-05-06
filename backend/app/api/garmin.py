"""
Garmin API routes for connecting and fetching golf data
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from app.core.auth import get_current_user
from app.services.garmin_service import garmin_service, GARMIN_AVAILABLE
from app.services.garmin_parser import parse_garmin_round
from app.services.database import db_service
from app.core.strokes_gained import StrokesGainedCalculator
import logging
import traceback

logger = logging.getLogger(__name__)

router = APIRouter()


class GarminCredentials(BaseModel):
    email: EmailStr
    password: str


class GarminAuthResponse(BaseModel):
    success: bool
    message: str


class GarminRoundSummary(BaseModel):
    activity_id: str
    activity_name: str
    course_name: str
    date: str
    total_shots: int


class FetchRoundsRequest(BaseModel):
    email: EmailStr
    password: str
    count: int = 5
    benchmark: str = "pga_tour"


class FetchRoundsResponse(BaseModel):
    success: bool
    rounds_fetched: int
    shots_imported: int
    rounds: List[GarminRoundSummary]


@router.post("/connect", response_model=GarminAuthResponse)
async def connect_garmin(
    credentials: GarminCredentials,
    current_user: dict = Depends(get_current_user)
):
    """
    Test Garmin Connect credentials
    """
    if not GARMIN_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Garmin Connect integration not available. Install garminconnect package."
        )
    
    try:
        success = garmin_service.authenticate(credentials.email, credentials.password)
        
        if success:
            return GarminAuthResponse(
                success=True,
                message="Successfully connected to Garmin Connect"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Garmin Connect credentials"
            )
    
    except ValueError as e:
        logger.error(f"Garmin auth ValueError: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e) or "Invalid Garmin credentials"
        )
    except Exception as e:
        logger.error(f"Garmin connection error: {type(e).__name__}: {e}", exc_info=True)
        error_msg = str(e) or f"Unexpected error: {type(e).__name__}"
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to connect to Garmin: {error_msg}"
        )


@router.post("/fetch", response_model=FetchRoundsResponse)
async def fetch_garmin_rounds(
    request: FetchRoundsRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Fetch recent golf rounds from Garmin Connect and import them
    """
    if not GARMIN_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Garmin Connect integration not available"
        )
    
    try:
        # Authenticate
        logger.info(f"Authenticating with Garmin for user {current_user['email']}")
        garmin_service.authenticate(request.email, request.password)
        
        # Fetch rounds
        logger.info(f"Fetching {request.count} recent rounds")
        rounds_data = garmin_service.fetch_recent_rounds(count=request.count)
        
        if not rounds_data:
            return FetchRoundsResponse(
                success=True,
                rounds_fetched=0,
                shots_imported=0,
                rounds=[]
            )
        
        # Parse and import each round
        calculator = StrokesGainedCalculator(request.benchmark)
        total_shots = 0
        round_summaries = []
        
        for round_data in rounds_data:
            try:
                # Parse Garmin data to shot format
                shots = parse_garmin_round(round_data)
                
                if not shots:
                    logger.warning(f"No shots found in round {round_data.get('activityId')}")
                    continue
                
                # Calculate strokes gained for each shot
                shots_to_create = []
                for shot_raw in shots:
                    strokes_gained = None
                    
                    if all(k in shot_raw for k in ["start_distance_to_hole", "end_distance_to_hole",
                                                    "start_position", "end_position"]):
                        if shot_raw["start_distance_to_hole"] is not None and shot_raw["end_distance_to_hole"] is not None:
                            strokes_gained = calculator.calculate_strokes_gained(
                                start_distance=shot_raw["start_distance_to_hole"],
                                start_lie=shot_raw["start_position"],
                                end_distance=shot_raw["end_distance_to_hole"],
                                end_lie=shot_raw["end_position"]
                            )
                    
                    shot_data = {
                        "user_id": current_user["id"],
                        "shot_date": shot_raw.get("shot_date"),
                        "hole_number": shot_raw.get("hole_number"),
                        "shot_number": shot_raw.get("shot_number"),
                        "club": shot_raw.get("club"),
                        "distance_yards": shot_raw.get("distance"),
                        "lie_type": shot_raw.get("start_position"),
                        "starting_position": shot_raw.get("start_position"),
                        "ending_position": shot_raw.get("end_position"),
                        "strokes_gained": strokes_gained,
                        "benchmark": request.benchmark,
                        "raw_data": shot_raw
                    }
                    shots_to_create.append(shot_data)
                
                # Bulk insert shots for this round
                if shots_to_create:
                    await db_service.bulk_create_shots(shots_to_create)
                    total_shots += len(shots_to_create)
                    
                    logger.info(f"Imported {len(shots_to_create)} shots from round {round_data.get('activityId')}")
                    
                    round_summaries.append(GarminRoundSummary(
                        activity_id=round_data.get("activityId", ""),
                        activity_name=round_data.get("activityName", ""),
                        course_name=shots[0].get("course_name", "") if shots else "",
                        date=shots[0].get("shot_date", "") if shots else "",
                        total_shots=len(shots_to_create)
                    ))
            
            except Exception as e:
                logger.error(f"Failed to import round {round_data.get('activityId')}: {e}")
                continue
        
        return FetchRoundsResponse(
            success=True,
            rounds_fetched=len(round_summaries),
            shots_imported=total_shots,
            rounds=round_summaries
        )
    
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Garmin fetch ValueError: {e}", exc_info=True)
        error_msg = str(e) or "Invalid request parameters"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    except Exception as e:
        logger.error(f"Error fetching Garmin rounds: {type(e).__name__}: {e}", exc_info=True)
        logger.error(f"Traceback: {traceback.format_exc()}")
        error_msg = str(e) or f"Unexpected error: {type(e).__name__}"
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch rounds from Garmin: {error_msg}"
        )


@router.get("/available")
async def check_garmin_available():
    """
    Check if Garmin Connect integration is available
    """
    return {
        "available": GARMIN_AVAILABLE,
        "message": "Garmin Connect integration is ready" if GARMIN_AVAILABLE 
                  else "garminconnect package not installed"
    }
