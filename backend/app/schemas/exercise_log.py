"""Pydantic schemas for Workout & Exercise logging payloads and exercise summaries."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ExerciseLogBase(BaseModel):
    """Base Pydantic schema for workout log entry attributes."""

    exercise_name: str = Field(..., min_length=1, description="Exercise name or sport")
    duration_minutes: float = Field(..., gt=0, description="Workout duration in minutes")
    met_value: float = Field(3.5, gt=0, description="Scientific MET value of workout")
    input_method: str = Field("manual", description="'manual', 'wearable', or 'ai_vision'")
    notes: Optional[str] = None


class ExerciseLogCreate(ExerciseLogBase):
    """Pydantic schema for creating an exercise log entry."""

    pass


class AIExerciseParseRequest(BaseModel):
    """Pydantic schema for AI natural language exercise logging request payload."""

    text_prompt: str = Field(..., min_length=2, description="Natural language description of workout e.g. '45 mins heavy squats'")


class AIExerciseParseResult(BaseModel):
    """Structured Pydantic schema passed to Gemini response_schema for exercise parsing."""

    exercise_name: str = Field(..., description="Concise clean exercise title or sport name")
    duration_minutes: float = Field(30.0, ge=0, description="Workout duration in minutes")
    met_value: float = Field(3.5, ge=0, description="Scientific Ainsworth MET value of exercise")
    notes: Optional[str] = None


class ExerciseLogResponse(ExerciseLogBase):
    """Pydantic schema for serialized exercise log entry response."""

    id: str
    user_id: str
    logged_at: datetime
    calories_burned: int

    model_config = ConfigDict(from_attributes=True)


class DailyExerciseSummary(BaseModel):
    """Pydantic schema for daily workouts summary."""

    total_workouts: int
    total_duration_minutes: float
    total_net_calories_burned: int
    workouts_logged_today: List[ExerciseLogResponse]
