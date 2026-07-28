"""Exercise domain service module handling workout logging and Net MET burn calculations."""

from datetime import date, datetime, time
from typing import Any, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.core.formulas import calculate_net_exercise_calories
from app.db.models.exercise_log import ExerciseLog
from app.db.models.user_auth import UserAuth
from app.schemas.exercise_log import AIExerciseParseRequest, DailyExerciseSummary, ExerciseLogCreate, ExerciseLogResponse


def create_workout_entry(db: Session, user: UserAuth, workout_in: ExerciseLogCreate) -> ExerciseLog:
    """Calculates Net MET burn and creates a workout log entry for the user.

    Args:
        db: Database session.
        user: Authenticated UserAuth entity.
        workout_in: Workout logging payload.

    Returns:
        Created ExerciseLog model instance.

    Raises:
        HTTPException: If user profile is not found.
    """
    profile = user.profile
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Physical profile not found. Please complete profile onboarding via POST /profiles.",
        )

    # Calculate net calories burned using Net MET (Solution A)
    net_calories_burned = calculate_net_exercise_calories(
        met=workout_in.met_value,
        weight_kg=profile.weight_kg,
        duration_minutes=workout_in.duration_minutes,
        activity_level=profile.activity_level,
    )

    db_workout = ExerciseLog(
        user_id=user.id,
        exercise_name=workout_in.exercise_name,
        duration_minutes=workout_in.duration_minutes,
        met_value=workout_in.met_value,
        calories_burned=net_calories_burned,
        input_method=workout_in.input_method,
        notes=workout_in.notes,
    )
    db.add(db_workout)
    db.commit()
    db.refresh(db_workout)
    return db_workout


def create_structured_workout_entry(db: Session, user: UserAuth, structured_in: Any) -> ExerciseLog:
    """Creates a workout entry using the structured exercise catalog metrics.

    Args:
        db: Database session.
        user: Authenticated UserAuth entity.
        structured_in: StructuredExerciseCreate payload.

    Returns:
        Created ExerciseLog instance.
    """
    from app.core.exercise_catalog import EXERCISE_CATALOG

    item = EXERCISE_CATALOG.get(structured_in.exercise_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exercise catalog ID '{structured_in.exercise_id}' not found.",
        )

    category = item["category"]
    exercise_name = item["name"]
    notes = ""

    if category == "distance":
        distance_km = structured_in.distance_km or 5.0
        avg_speed = item.get("avg_speed_kmh", 10.0)
        duration_mins = structured_in.duration_minutes or ((distance_km / avg_speed) * 60.0)
        met_val = item["met"]
        notes = f"{distance_km} km distance run/walk"

    elif category == "reps":
        sets = structured_in.sets or item.get("default_sets", 3)
        reps = structured_in.reps or item.get("default_reps", 15)
        total_reps = sets * reps
        cadence = item.get("cadence_sec_per_rep", 2.5)
        duration_mins = structured_in.duration_minutes or max((total_reps * cadence) / 60.0, 1.0)
        met_val = item["met"]
        notes = f"{sets} sets × {reps} reps ({total_reps} total reps)"

    else:  # time
        duration_mins = structured_in.duration_minutes or item.get("default_duration_min", 30.0)
        intensity = structured_in.intensity or "moderate"
        if intensity == "low":
            met_val = item.get("met_low", item.get("met", 3.5))
        elif intensity == "high":
            met_val = item.get("met_high", item.get("met", 8.0))
        else:
            met_val = item.get("met_moderate", item.get("met", 5.0))
        notes = f"{duration_mins} mins ({intensity} intensity)"

    workout_in = ExerciseLogCreate(
        exercise_name=exercise_name,
        duration_minutes=round(duration_mins, 1),
        met_value=met_val,
        input_method="structured_catalog",
        notes=notes,
    )
    return create_workout_entry(db=db, user=user, workout_in=workout_in)


def create_workout_entry_via_ai(db: Session, user: UserAuth, prompt_in: AIExerciseParseRequest) -> ExerciseLog:
    """Parses natural language workout text using Gemini AI response_schema and creates a new ExerciseLog entry.

    Args:
        db: Database session.
        user: Authenticated UserAuth entity.
        prompt_in: AI exercise parse request payload containing text_prompt.

    Returns:
        Created ExerciseLog model instance.
    """
    from app.core.prompts import EXERCISE_PARSING_PROMPT_TEMPLATE
    from app.schemas.exercise_log import AIExerciseParseResult
    from app.services import gemini_service

    prompt = EXERCISE_PARSING_PROMPT_TEMPLATE.format(text_prompt=prompt_in.text_prompt)
    parsed_result: AIExerciseParseResult = gemini_service.generate_structured_output(
        prompt=prompt,
        response_schema=AIExerciseParseResult,
    )

    workout_in = ExerciseLogCreate(
        exercise_name=parsed_result.exercise_name,
        duration_minutes=parsed_result.duration_minutes,
        met_value=parsed_result.met_value,
        input_method="ai_nlp",
        notes=parsed_result.notes,
    )
    return create_workout_entry(db=db, user=user, workout_in=workout_in)


def get_user_today_workouts(db: Session, user: UserAuth) -> List[ExerciseLog]:
    """Retrieves all workouts logged today by the user.

    Args:
        db: Database session.
        user: Authenticated UserAuth entity.

    Returns:
        List of ExerciseLog model instances.
    """
    today_start = datetime.combine(date.today(), time.min)
    today_end = datetime.combine(date.today(), time.max)

    return (
        db.query(ExerciseLog)
        .filter(
            ExerciseLog.user_id == user.id,
            ExerciseLog.logged_at >= today_start,
            ExerciseLog.logged_at <= today_end,
        )
        .order_by(ExerciseLog.logged_at.desc())
        .all()
    )


def calculate_user_today_exercise_summary(db: Session, user: UserAuth) -> DailyExerciseSummary:
    """Calculates today's total workouts count, total duration, and total net calories burned.

    Args:
        db: Database session.
        user: Authenticated UserAuth entity.

    Returns:
        DailyExerciseSummary instance.
    """
    today_start = datetime.combine(date.today(), time.min)
    today_end = datetime.combine(date.today(), time.max)

    workouts = (
        db.query(ExerciseLog)
        .filter(
            ExerciseLog.user_id == user.id,
            ExerciseLog.logged_at >= today_start,
            ExerciseLog.logged_at <= today_end,
        )
        .all()
    )

    total_duration = sum(w.duration_minutes for w in workouts)
    total_burn = sum(w.calories_burned for w in workouts)
    workout_responses = [ExerciseLogResponse.model_validate(w) for w in workouts]

    return DailyExerciseSummary(
        total_workouts=len(workouts),
        total_duration_minutes=round(total_duration, 1),
        total_net_calories_burned=total_burn,
        workouts_logged_today=workout_responses,
    )
