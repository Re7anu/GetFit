"""Pydantic schemas for Workout logging payloads and workout summaries."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class WorkoutLogBase(BaseModel):
    """Base Pydantic schema for workout log entry attributes."""

    exercise_name: str = Field(..., min_length=1, description="Exercise name or sport")
    duration_minutes: float = Field(..., gt=0, description="Workout duration in minutes")
    met_value: float = Field(3.5, gt=0, description="Scientific MET value of workout")
    calories_burned: Optional[int] = Field(None, ge=0, description="Manual calories burned in kcal")
    additional_weight_kg: float = Field(0.0, ge=0.0)
    input_method: str = Field("structured", description="'structured', 'manual', or 'ai_vision'")
    notes: Optional[str] = None


class WorkoutLogCreate(WorkoutLogBase):
    """Pydantic schema for creating a workout log entry."""

    pass


class StructuredWorkoutCreate(BaseModel):
    """Pydantic schema for creating structured workout log based on catalog item."""

    exercise_id: str = Field(..., description="Unique exercise catalog ID e.g. 'pushups' or 'running_outdoor'")
    distance_km: Optional[float] = Field(None, ge=0, description="Distance in kilometers if distance-based")
    sets: Optional[int] = Field(1, ge=1, description="Number of sets if rep-based")
    reps: Optional[int] = Field(None, ge=1, description="Reps per set if rep-based")
    additional_weight_kg: Optional[float] = Field(0.0, ge=0.0, description="Additional external weight added in kg (barbell plates, dumbbells, dip belt)")
    duration_minutes: Optional[float] = Field(None, ge=0, description="Duration in minutes if time-based or specified")
    intensity: Optional[str] = Field("moderate", description="'low', 'moderate', or 'high'")
    dont_know_details: bool = Field(False, description="True if user checked 'I don't know details'")





class WorkoutLogResponse(WorkoutLogBase):
    """Pydantic schema for serialized workout log entry response."""

    id: str
    user_id: str
    logged_at: datetime
    calories_burned: int

    model_config = ConfigDict(from_attributes=True)


class DailyWorkoutSummary(BaseModel):
    """Pydantic schema for daily workouts summary."""

    total_workouts: int
    total_duration_minutes: float
    total_net_calories_burned: int
    workouts_logged_today: List[WorkoutLogResponse]


class DayScheduleItem(BaseModel):
    """Schema representing a single day in the weekly routine plan."""

    day: str  # "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
    activity_type: str  # "rest", "gym", "sports", "cardio"
    targets: List[str] = Field(default_factory=list)  # ["chest", "shoulders"], ["football"], ["walking"]
    is_completed: bool = False


class WorkoutPlanUpdate(BaseModel):
    """Schema for updating fitness focus and weekly schedule."""

    fitness_focus: str = Field("athletic", description="'bodybuilding', 'athletic', or 'sports_endurance'")
    schedule: List[DayScheduleItem]


class WorkoutPlanResponse(BaseModel):
    """Schema for returning full weekly routine blueprint and protein cap thresholds."""

    fitness_focus: str
    weekly_schedule: List[DayScheduleItem]
    base_protein_g_per_kg: float
    max_protein_cap_g_per_kg: float
    user_weight_kg: float
    calculated_base_protein_g: float
    calculated_max_protein_cap_g: float

