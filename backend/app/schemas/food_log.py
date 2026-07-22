"""Pydantic schemas for Food Log creation, validation, and responses."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class FoodLogBase(BaseModel):
    """Base Pydantic schema for food log attributes."""

    meal_type: str = Field(..., description="breakfast, lunch, dinner, snack")
    description: str = Field(..., min_length=1)
    calories: int = Field(..., ge=0)
    protein_g: float = Field(0.0, ge=0)
    carbs_g: float = Field(0.0, ge=0)
    fat_g: float = Field(0.0, ge=0)
    quantity_g: Optional[float] = Field(None, gt=0)
    input_method: str = "manual"


class FoodLogCreate(FoodLogBase):
    """Pydantic schema for logging a new meal."""

    pass


class FoodLogResponse(FoodLogBase):
    """Pydantic schema for food log HTTP responses."""

    id: str
    user_id: str
    logged_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DailyNutritionSummary(BaseModel):
    """Pydantic schema for daily nutrition totals versus target budget."""

    date: str
    calorie_target: int
    calories_consumed: int
    calories_remaining: int
    protein_target_g: float
    protein_consumed_g: float
    carbs_target_g: float
    carbs_consumed_g: float
    fat_target_g: float
    fat_consumed_g: float
