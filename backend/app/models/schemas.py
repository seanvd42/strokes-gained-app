"""
Pydantic models for request/response validation
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import date, time, datetime
from decimal import Decimal


# Profile models
class ProfileBase(BaseModel):
    name: Optional[str] = None
    data_source: str = "garmin"


class ProfileCreate(ProfileBase):
    pass


class ProfileUpdate(ProfileBase):
    pass


class Profile(ProfileBase):
    id: str
    email: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Shot models
class ShotBase(BaseModel):
    shot_date: date
    shot_time: Optional[time] = None
    hole_number: Optional[int] = Field(None, ge=1, le=18)
    shot_number: Optional[int] = Field(None, ge=1)
    club: Optional[str] = None
    distance_yards: Optional[Decimal] = None
    lie_type: Optional[str] = None
    starting_position: Optional[str] = None
    ending_position: Optional[str] = None
    benchmark: str = "pga_tour"
    raw_data: Optional[Dict[str, Any]] = None


class ShotCreate(ShotBase):
    pass


class Shot(ShotBase):
    id: str
    user_id: str
    strokes_gained: Optional[Decimal] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ShotWithCalculation(Shot):
    """Shot with calculated strokes gained"""
    pass


# Garmin data import models
class GarminShotData(BaseModel):
    """Raw Garmin shot data"""
    club: str
    distance: float
    start_position: str
    end_position: str
    start_distance_to_hole: float
    end_distance_to_hole: float
    shot_time: Optional[str] = None
    hole_number: Optional[int] = None


class GarminRoundData(BaseModel):
    """Garmin round import"""
    round_date: date
    shots: List[GarminShotData]
    benchmark: str = "pga_tour"


class BulkShotImport(BaseModel):
    """Bulk shot import from Garmin or other sources"""
    shots: List[Dict[str, Any]]
    benchmark: str = "pga_tour"


# Query/Filter models
class ShotFilters(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    benchmark: Optional[str] = None
    club: Optional[str] = None
    min_strokes_gained: Optional[float] = None
    max_strokes_gained: Optional[float] = None


# Summary models
class SummaryMetrics(BaseModel):
    total_shots: int
    total_strokes_gained: float
    avg_strokes_gained: float
    best_shot: float
    worst_shot: float
    positive_shots: int
    negative_shots: int


class DashboardData(BaseModel):
    shots: List[Shot]
    summary: SummaryMetrics
    
    
# Response models
class MessageResponse(BaseModel):
    message: str
    detail: Optional[str] = None


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
