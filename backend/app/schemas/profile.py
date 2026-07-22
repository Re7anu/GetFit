from pydantic import BaseModel, Field, ConfigDict
from datetime import date, datetime
from typing import Optional

class UserProfileBase(BaseModel):
    name: Optional[str] = None
    sex: str = Field(..., description="male or female")
    birth_date: date
    height_cm: float = Field(..., gt=0)
    weight_kg: float = Field(..., gt=0)
    activity_level: str = Field(..., description="sedentary, lightly_active, moderately_active, very_active, extra_active")
    goal_type: str = Field(..., description="lose_weight, maintain, gain_muscle")
    target_weight_kg: Optional[float] = Field(None, gt=0)

class UserProfileCreate(UserProfileBase):
    pass

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    sex: Optional[str] = None
    birth_date: Optional[date] = None
    height_cm: Optional[float] = Field(None, gt=0)
    weight_kg: Optional[float] = Field(None, gt=0)
    activity_level: Optional[str] = None
    goal_type: Optional[str] = None
    target_weight_kg: Optional[float] = Field(None, gt=0)

class UserProfileResponse(UserProfileBase):
    id: str
    user_id: str
    calculated_calorie_target: int
    calculated_protein_target_g: float
    calculated_carb_target_g: float
    calculated_fat_target_g: float
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
