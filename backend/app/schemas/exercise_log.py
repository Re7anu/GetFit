"""Pydantic schemas for Exercise Log creation, validation, and responses."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class ExerciseLogBase(BaseModel):
    """Base Pydantic schema for exercise log attributes."""

    exercise_name: str = Field(..., min_length=1)
    duration_minutes: float = Field(..., gt=0)
    met_value: float = Field(3.5, gt=0, description="Metabolic Equivalent of Task")
    notes: Optional[str] = None
    input_method: str = "manual"


class ExerciseLogCreate(ExerciseLogBase):
    """Pydantic schema for logging a new workout."""

    pass


class ExerciseLogResponse(ExerciseLogBase):
    """Pydantic schema for exercise log HTTP responses."""

    id: str
    user_id: str
    logged_at: datetime
    calories_burned: int

    model_config = ConfigDict(from_attributes=True)


class DailyExerciseSummary(BaseModel):
    """Pydantic schema for daily exercise totals."""

    date: str
    total_workouts: int
    total_duration_minutes: float
    total_calories_burned: int
