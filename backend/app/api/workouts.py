"""Workout Logging API endpoints module."""

from typing import List
from fastapi import APIRouter, Depends, status, Query as FastAPIQuery
from sqlalchemy.orm import Session
from app.core.auth_dependencies import get_current_user
from app.db.models.user_auth import UserAuth
from app.db.session import get_db
from app.core.exercise_catalog import get_exercise_catalog_list
from app.schemas.workout_log import (
    DailyWorkoutSummary,
    WorkoutLogCreate,
    WorkoutLogResponse,
    StructuredWorkoutCreate,
    WorkoutPlanResponse,
    WorkoutPlanUpdate,
)
from app.services import workout_service
from app.services.exercise_catalog_service import get_exercise_catalog_list

router = APIRouter()


@router.get("/catalog")
def get_exercise_catalog(db: Session = Depends(get_db)):
    """Retrieves the list of supported structured exercise catalog items from database."""
    return get_exercise_catalog_list(db=db)


@router.post("/logs/structured", response_model=WorkoutLogResponse, status_code=status.HTTP_201_CREATED)
def create_structured_workout_log(
    structured_in: StructuredWorkoutCreate,
    current_user: UserAuth = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Creates a workout entry using structured exercise catalog metrics."""
    return workout_service.create_structured_workout_entry(db=db, user=current_user, structured_in=structured_in)


@router.post("/logs/manual", response_model=WorkoutLogResponse, status_code=status.HTTP_201_CREATED)
def create_manual_workout_log(
    workout_in: WorkoutLogCreate,
    current_user: UserAuth = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Manually logs a workout entry with raw MET and duration, calculating net calories burned."""
    return workout_service.create_workout_entry(db=db, user=current_user, workout_in=workout_in)





@router.get("/logs/today", response_model=List[WorkoutLogResponse])
def get_today_workouts(
    current_user: UserAuth = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves all workouts logged today by current authenticated user."""
    return workout_service.get_user_today_workouts(db=db, user=current_user)


@router.get("/summary/today", response_model=DailyWorkoutSummary)
def get_today_workout_summary(
    current_user: UserAuth = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Calculates today's total workouts count, total duration, and total net calories burned."""
    return workout_service.calculate_user_today_workout_summary(db=db, user=current_user)


@router.delete("/logs/{workout_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workout_log(
    workout_id: str,
    current_user: UserAuth = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Deletes a logged workout entry and automatically recalculates daily caloric budget and macros."""
    workout_service.delete_workout_entry(db=db, user=current_user, workout_id=workout_id)


@router.put("/logs/{workout_id}", response_model=WorkoutLogResponse)
def update_workout_log(
    workout_id: str,
    workout_in: WorkoutLogCreate,
    current_user: UserAuth = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Updates an existing logged workout entry and recalculates Net MET calories burned."""
    return workout_service.update_workout_entry(db=db, user=current_user, workout_id=workout_id, workout_in=workout_in)


@router.get("/plan", response_model=WorkoutPlanResponse)
def get_workout_plan(
    current_user: UserAuth = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves authenticated user's weekly routine blueprint and fitness focus protein thresholds."""
    return workout_service.get_user_workout_plan(db=db, user=current_user)


@router.post("/plan", response_model=WorkoutPlanResponse)
def update_workout_plan(
    plan_in: WorkoutPlanUpdate,
    current_user: UserAuth = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Saves/updates user's weekly routine blueprint and fitness focus."""
    return workout_service.update_user_workout_plan(db=db, user=current_user, plan_in=plan_in)


@router.post("/plan/toggle-day", response_model=WorkoutPlanResponse)
def toggle_workout_plan_day(
    day: str = FastAPIQuery(..., description="Day name e.g. 'monday', 'tuesday'"),
    current_user: UserAuth = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Toggles 1-tap manual completion status for a day in the weekly routine plan."""
    return workout_service.toggle_workout_plan_day(db=db, user=current_user, day=day)

