"""Pydantic schemas for User Profile onboarding, updates, and target serialization."""

from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class UserProfileBase(BaseModel):
    """Base Pydantic schema for physical user profile attributes."""

    name: Optional[str] = None
    sex: str = Field(..., description="'male' or 'female'")
    birth_date: date
    height_cm: float = Field(..., gt=0)
    weight_kg: float = Field(..., gt=0)
    target_weight_kg: float = Field(..., gt=0)
    timeline_weeks: int = Field(12, ge=1, le=104, description="Target timeline in weeks (1-104)")
    activity_level: str = Field(..., description="sedentary, lightly_active, moderately_active, very_active, extra_active")


class UserProfileCreate(UserProfileBase):
    """Pydantic schema for onboarding/creating a user profile."""

    pass


class UserProfileUpdate(BaseModel):
    """Pydantic schema for updating physical profile metrics."""

    name: Optional[str] = None
    sex: Optional[str] = Field(None, description="'male' or 'female'")
    birth_date: Optional[date] = None
    height_cm: Optional[float] = Field(None, gt=0)
    weight_kg: Optional[float] = Field(None, gt=0)
    target_weight_kg: Optional[float] = Field(None, gt=0)
    timeline_weeks: Optional[int] = Field(None, ge=1, le=104)
    activity_level: Optional[str] = None


class UserProfileResponse(UserProfileBase):
    """Pydantic schema for serialized profile responses with pre-computed targets."""

    id: str
    user_id: str
    bmr: float
    tdee: float
    caloric_pace_kcal_per_day: float
    goal_type: str
    calculated_calorie_target: int
    calculated_protein_target_g: float
    calculated_carb_target_g: float
    calculated_fat_target_g: float
    is_safe_pace: bool
    suggested_min_weeks: int
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
