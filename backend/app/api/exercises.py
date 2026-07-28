"""Exercise & Workout Logging API endpoints module."""

from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.auth_dependencies import get_current_user
from app.db.models.user_auth import UserAuth
from app.db.session import get_db
from app.core.exercise_catalog import get_exercise_catalog_list
from app.schemas.exercise_log import AIExerciseParseRequest, DailyExerciseSummary, ExerciseLogCreate, ExerciseLogResponse, StructuredExerciseCreate
from app.services import exercise_service

router = APIRouter()


@router.get("/catalog")
def get_exercise_catalog():
    """Retrieves the list of supported structured exercise catalog items."""
    return get_exercise_catalog_list()


@router.post("/logs/structured", response_model=ExerciseLogResponse, status_code=status.HTTP_201_CREATED)
def create_structured_exercise_log(
    structured_in: StructuredExerciseCreate,
    current_user: UserAuth = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Creates a workout entry using structured exercise catalog metrics."""
    return exercise_service.create_structured_workout_entry(db=db, user=current_user, structured_in=structured_in)


@router.post("/logs", response_model=ExerciseLogResponse, status_code=status.HTTP_201_CREATED)
def create_exercise_log(
    workout_in: ExerciseLogCreate,
    current_user: UserAuth = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Logs a workout entry and calculates net calories burned using Solution A (Net MET)."""
    return exercise_service.create_workout_entry(db=db, user=current_user, workout_in=workout_in)


@router.post("/logs/ai-parse", response_model=ExerciseLogResponse, status_code=status.HTTP_201_CREATED)
def create_exercise_log_via_ai(
    prompt_in: AIExerciseParseRequest,
    current_user: UserAuth = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Parses natural language workout text using Gemini AI and logs the workout with Net MET burn."""
    return exercise_service.create_workout_entry_via_ai(db=db, user=current_user, prompt_in=prompt_in)


@router.get("/logs/today", response_model=List[ExerciseLogResponse])
def get_today_exercises(
    current_user: UserAuth = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves all workouts logged today by current authenticated user."""
    return exercise_service.get_user_today_workouts(db=db, user=current_user)


@router.get("/summary/today", response_model=DailyExerciseSummary)
def get_today_exercise_summary(
    current_user: UserAuth = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Calculates today's total workouts count, total duration, and total net calories burned."""
    return exercise_service.calculate_user_today_exercise_summary(db=db, user=current_user)
