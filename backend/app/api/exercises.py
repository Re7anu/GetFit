"""Exercise API endpoints module for workout logging and calorie burn calculations."""

from datetime import date, datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.api.dependencies import get_current_user
from app.db.models.exercise_log import ExerciseLog
from app.db.models.user_auth import UserAuth
from app.db.session import get_db
from app.schemas.exercise_log import DailyExerciseSummary, ExerciseLogCreate, ExerciseLogResponse

router = APIRouter()


@router.post("/logs", response_model=ExerciseLogResponse, status_code=status.HTTP_201_CREATED)
def log_exercise(
    exercise_in: ExerciseLogCreate,
    current_user: UserAuth = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Logs a new workout entry and calculates calories burned via the scientific MET formula.

    Args:
        exercise_in: Workout payload containing exercise_name, duration_minutes, and met_value.
        current_user: Authenticated UserAuth model instance.
        db: Database session instance.

    Returns:
        Created ExerciseLog model instance with calculated calories_burned.

    Raises:
        HTTPException: If user profile is missing weight data.
    """
    profile = current_user.profile
    if not profile or not profile.weight_kg:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User profile weight is required to calculate calories burned.")

    # Scientific MET Formula: Calories Burned = MET * Weight (kg) * (Duration / 60)
    calories_burned = int(exercise_in.met_value * profile.weight_kg * (exercise_in.duration_minutes / 60.0))

    db_exercise = ExerciseLog(
        user_id=current_user.id,
        exercise_name=exercise_in.exercise_name,
        duration_minutes=exercise_in.duration_minutes,
        met_value=exercise_in.met_value,
        calories_burned=calories_burned,
        input_method=exercise_in.input_method,
        notes=exercise_in.notes,
    )
    db.add(db_exercise)
    db.commit()
    db.refresh(db_exercise)
    return db_exercise


@router.get("/logs/today", response_model=List[ExerciseLogResponse])
def read_today_exercise_logs(
    current_user: UserAuth = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves all exercise logs recorded by the current user today.

    Args:
        current_user: Authenticated UserAuth model instance.
        db: Database session instance.

    Returns:
        List of ExerciseLogResponse entries.
    """
    today_start = datetime.combine(date.today(), datetime.min.time())
    today_end = datetime.combine(date.today(), datetime.max.time())

    workouts = (
        db.query(ExerciseLog)
        .filter(
            ExerciseLog.user_id == current_user.id,
            ExerciseLog.logged_at >= today_start,
            ExerciseLog.logged_at <= today_end,
        )
        .order_by(ExerciseLog.logged_at.desc())
        .all()
    )
    return workouts


@router.get("/summary/today", response_model=DailyExerciseSummary)
def read_today_exercise_summary(
    current_user: UserAuth = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Calculates total workout duration and calories burned by the current user today.

    Args:
        current_user: Authenticated UserAuth model instance.
        db: Database session instance.

    Returns:
        DailyExerciseSummary showing workout counts, duration, and calories burned.
    """
    today_start = datetime.combine(date.today(), datetime.min.time())
    today_end = datetime.combine(date.today(), datetime.max.time())

    summary = (
        db.query(
            func.count(ExerciseLog.id).label("total_workouts"),
            func.coalesce(func.sum(ExerciseLog.duration_minutes), 0.0).label("total_duration"),
            func.coalesce(func.sum(ExerciseLog.calories_burned), 0).label("total_calories"),
        )
        .filter(
            ExerciseLog.user_id == current_user.id,
            ExerciseLog.logged_at >= today_start,
            ExerciseLog.logged_at <= today_end,
        )
        .first()
    )

    return DailyExerciseSummary(
        date=date.today().isoformat(),
        total_workouts=int(summary.total_workouts),
        total_duration_minutes=float(summary.total_duration),
        total_calories_burned=int(summary.total_calories),
    )
