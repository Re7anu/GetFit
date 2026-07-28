"""Pydantic schemas for Food & Meal logging payloads and daily nutrition budget summaries."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class FoodLogBase(BaseModel):
    """Base Pydantic schema for food log entry attributes."""

    meal_type: str = Field(..., description="'breakfast', 'lunch', 'dinner', or 'snack'")
    description: str = Field(..., min_length=1, description="Meal item description")
    calories: int = Field(..., ge=0, description="Total energy in kcal")
    protein_g: float = Field(0.0, ge=0)
    carbs_g: float = Field(0.0, ge=0)
    fat_g: float = Field(0.0, ge=0)
    quantity_g: Optional[float] = Field(None, ge=0)
    input_method: str = Field("manual", description="'manual', 'ai_vision', or 'barcode'")


class FoodLogCreate(FoodLogBase):
    """Pydantic schema for creating a food log entry."""

    pass


class AIFoodParseRequest(BaseModel):
    """Pydantic schema for AI natural language meal logging request payload."""

    text_prompt: str = Field(..., min_length=2, description="Natural language description of food/meal e.g. '2 eggs and toast'")


class AIFoodParseResult(BaseModel):
    """Structured Pydantic schema passed to Gemini response_schema for food parsing."""

    meal_type: str = Field(..., description="'breakfast', 'lunch', 'dinner', or 'snack'")
    description: str = Field(..., description="Concise clean summary of food items")
    calories: int = Field(..., ge=0, description="Estimated total kilocalories")
    protein_g: float = Field(0.0, ge=0)
    carbs_g: float = Field(0.0, ge=0)
    fat_g: float = Field(0.0, ge=0)
    quantity_g: Optional[float] = Field(None, ge=0)


class FoodLogResponse(FoodLogBase):
    """Pydantic schema for serialized food log entry response."""

    id: str
    user_id: str
    logged_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DailyNutritionSummary(BaseModel):
    """Pydantic schema for daily nutrition budget vs consumed summary."""

    base_calorie_target: int
    exercise_net_calories_burned: int
    adjusted_calorie_target: int
    consumed_calories: int
    remaining_calories: int

    target_protein_g: float
    consumed_protein_g: float

    target_carb_g: float
    consumed_carb_g: float

    target_fat_g: float
    consumed_fat_g: float

    meals_logged_today: List[FoodLogResponse]
