"""Pydantic schemas for User Profile validation and response serialization."""

from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class UserProfileBase(BaseModel):
    """Base Pydantic model for user physical profile attributes."""

    name: Optional[str] = None
    sex: str = Field(..., description="male or female")
    birth_date: date
    height_cm: float = Field(..., gt=0)
    weight_kg: float = Field(..., gt=0)
    activity_level: str = Field(..., description="sedentary, lightly_active, moderately_active, very_active, extra_active")
    goal_type: str = Field(..., description="lose_weight, maintain, gain_muscle")
    target_weight_kg: Optional[float] = Field(None, gt=0)


class UserProfileCreate(UserProfileBase):
    """Pydantic model for profile creation payload during user registration."""

    pass


class UserProfileUpdate(BaseModel):
    """Pydantic model for partial profile update requests."""

    name: Optional[str] = None
    sex: Optional[str] = None
    birth_date: Optional[date] = None
    height_cm: Optional[float] = Field(None, gt=0)
    weight_kg: Optional[float] = Field(None, gt=0)
    activity_level: Optional[str] = None
    goal_type: Optional[str] = None
    target_weight_kg: Optional[float] = Field(None, gt=0)


class UserProfileResponse(UserProfileBase):
    """Pydantic model for profile responses containing calculated targets."""

    id: str
    user_id: str
    calculated_calorie_target: int
    calculated_protein_target_g: float
    calculated_carb_target_g: float
    calculated_fat_target_g: float
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

