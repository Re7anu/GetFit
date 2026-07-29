"""Pydantic schemas for Health & Workout Analytics reporting."""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.food_log import FoodLogResponse
from app.schemas.workout_log import WorkoutLogResponse


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


class DayDetailResponse(BaseModel):
    """Pydantic schema for single-day granular log breakdown."""

    date: str
    is_goal_hit: bool
    status_reason: str
    totals: Dict[str, Any]
    meals: List[FoodLogResponse]
    workouts: List[WorkoutLogResponse]


class WorkoutAnalyticsSummary(BaseModel):
    """Placeholder Pydantic schema for upcoming workout volume & MET analytics."""

    total_workout_sessions: int
    total_active_minutes: float
    total_net_calories_burned: int
    top_exercise_category: Optional[str] = None
