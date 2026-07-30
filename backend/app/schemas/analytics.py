"""Pydantic schemas for Health & Workout Analytics reporting."""

from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class DailyHistorySnapshot(BaseModel):
    """Pydantic schema for historical daily calorie & protein goal performance."""

    date: str
    goal_type: str
    adjusted_calorie_target: int
    consumed_calories: int
    target_protein_g: float
    consumed_protein_g: float
    is_goal_hit: bool
    status_reason: str


class AnalyticsHistoryResponse(BaseModel):
    """Pydantic schema for 30-day analytics history with streak calculation metrics."""

    snapshots: List[DailyHistorySnapshot]
    current_streak: int = Field(..., description="Current consecutive days hitting nutrition & workout goals")
    best_streak: int = Field(..., description="Best consecutive days streak achieved over past 30 days")
    total_goals_hit_30d: int = Field(..., description="Total days goal was hit in past 30 days")

    model_config = ConfigDict(from_attributes=True)


class DayDetailMealItem(BaseModel):
    """Pydantic schema for individual meal summary item in day detail breakdown."""

    id: str
    meal_type: str
    description: str
    calories: int
    protein_g: float
    carbs_g: float
    fat_g: float
    time: str


class DayDetailWorkoutItem(BaseModel):
    """Pydantic schema for individual workout summary item in day detail breakdown."""

    id: str
    exercise_name: str
    duration_minutes: float
    calories_burned: int
    time: str


class DayDetailResponse(BaseModel):
    """Pydantic schema for single-day granular log breakdown."""

    date: str
    goal_type: str
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
    is_goal_hit: bool
    status_reason: str
    meals: List[DayDetailMealItem]
    workouts: List[DayDetailWorkoutItem]

    model_config = ConfigDict(from_attributes=True)


class WorkoutAnalyticsSummary(BaseModel):
    """Placeholder Pydantic schema for upcoming workout volume & MET analytics."""

    total_workout_sessions: int
    total_active_minutes: float
    total_net_calories_burned: int
    top_exercise_category: Optional[str] = None
