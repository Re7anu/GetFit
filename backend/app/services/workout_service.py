"""Workout domain service module handling workout logging and Net MET burn calculations."""

from datetime import date, datetime, time
from typing import Any, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.core.constants import FITNESS_FOCUS_CONFIG
from app.core.exercise_catalog import EXERCISE_CATALOG
from app.core.formulas import calculate_net_exercise_calories
from app.db.models.workout_log import WorkoutLog
from app.db.models.user_auth import UserAuth
from app.schemas.workout_log import (
    DailyWorkoutSummary,
    WorkoutLogCreate,
    WorkoutLogResponse,
    StructuredWorkoutCreate,
    WorkoutPlanResponse,
    WorkoutPlanUpdate,
    DayScheduleItem,
)


def create_workout_entry(db: Session, user: UserAuth, workout_in: WorkoutLogCreate) -> WorkoutLog:
    """Calculates Net MET burn and creates a workout log entry for the user.

    Args:
        db: Database session.
        user: Authenticated UserAuth entity.
        workout_in: Workout logging payload.

    Returns:
        Created WorkoutLog model instance.

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

    db_workout = WorkoutLog(
        user_id=user.id,
        exercise_name=workout_in.exercise_name,
        duration_minutes=workout_in.duration_minutes,
        met_value=workout_in.met_value,
        calories_burned=net_calories_burned,
        additional_weight_kg=getattr(workout_in, 'additional_weight_kg', 0.0) or 0.0,
        input_method=workout_in.input_method,
        notes=workout_in.notes,
    )
    db.add(db_workout)
    db.commit()
    db.refresh(db_workout)
    return db_workout


def create_structured_workout_entry(db: Session, user: UserAuth, structured_in: Any) -> WorkoutLog:
    """Creates a workout entry using the structured exercise catalog metrics.

    Args:
        db: Database session.
        user: Authenticated UserAuth entity.
        structured_in: StructuredWorkoutCreate payload.

    Returns:
        Created WorkoutLog instance.
    """
    profile = user.profile
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Physical profile not found. Please complete profile onboarding via POST /profiles.",
        )

    item = EXERCISE_CATALOG.get(structured_in.exercise_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exercise catalog ID '{structured_in.exercise_id}' not found.",
        )

    category = item["category"]
    exercise_name = item["name"]
    notes = ""
    add_weight = structured_in.additional_weight_kg or 0.0

    if category == "distance":
        distance_km = structured_in.distance_km or 5.0
        
        if structured_in.duration_minutes and structured_in.duration_minutes > 0:
            duration_mins = structured_in.duration_minutes
            speed_kmh = (distance_km / duration_mins) * 60.0
            
            # Dynamic Ainsworth Compendium Speed-Based MET Scaling by Locomotion Family
            ex_id_lower = structured_in.exercise_id.lower()
            ex_name_lower = exercise_name.lower()

            is_wheel = "cycling" in ex_id_lower or "bike" in ex_name_lower or "bicycling" in ex_name_lower
            is_water = "swim" in ex_id_lower or "swimming" in ex_name_lower or "rowing" in ex_name_lower or "kayak" in ex_name_lower

            if is_wheel:
                # 1. Wheel Locomotion (Cycling / Bicycling)
                if speed_kmh < 10.0:
                    met_val = 4.0   # Extremely slow coasting / leisure (< 6 mph)
                elif speed_kmh < 15.0:
                    met_val = 6.0   # Light effort cycling (6 - 9.3 mph)
                elif speed_kmh < 19.0:
                    met_val = 8.0   # Moderate effort cycling (9.3 - 11.8 mph)
                elif speed_kmh < 22.5:
                    met_val = 10.0  # Vigorous effort cycling (11.8 - 14 mph)
                elif speed_kmh < 26.0:
                    met_val = 12.0  # Very fast cycling (14 - 16 mph)
                else:
                    met_val = 14.0  # Racing effort cycling (> 16 mph)
            elif is_water:
                # 2. Water Locomotion (Swimming / Rowing / Kayaking)
                if speed_kmh < 2.0:
                    met_val = 4.5   # Light leisure swimming / paddling (< 2 km/h)
                elif speed_kmh < 3.0:
                    met_val = 7.0   # Moderate lap swimming (2 - 3 km/h)
                else:
                    met_val = 10.0  # Vigorous competitive swimming (> 3 km/h)
            else:
                # 3. Foot Locomotion (Running / Walking / Jogging / Hiking)
                if speed_kmh < 6.0:
                    met_val = 3.8  # Normal / Brisk Walking pace
                elif speed_kmh < 8.0:
                    met_val = 6.0  # Slow Jogging pace
                elif speed_kmh < 10.0:
                    met_val = item.get("met", 8.0)  # Moderate Running pace
                elif speed_kmh < 12.0:
                    met_val = 10.0  # Fast Running pace
                else:
                    met_val = 11.5  # Vigorous Sprinting / Race pace
            
            notes = f"{distance_km} km at {speed_kmh:.1f} km/h avg speed"
        else:
            avg_speed = item.get("avg_speed_kmh", 10.0)
            duration_mins = (distance_km / avg_speed) * 60.0
            met_val = item["met"]
            notes = f"{distance_km} km distance run/walk"

    elif category == "reps":
        sets = structured_in.sets or item.get("default_sets", 3)
        reps = structured_in.reps or item.get("default_reps", 15)
        total_reps = sets * reps
        cadence = item.get("cadence_sec_per_rep", 2.5)
        
        # 1. Calculate active rep execution duration
        active_mins = max((total_reps * cadence) / 60.0, 0.5)
        
        # 2. Calculate inter-set rest duration (standard 60s / 1.0 min rest between sets)
        rest_mins = max(sets - 1, 0) * 1.0
        
        # Total workout session duration incorporating set rest intervals
        duration_mins = structured_in.duration_minutes or (active_mins + rest_mins)
        
        # 3. Calculate Mass Load Multiplier (Body Weight + Additional External Weight)
        user_weight = max(profile.weight_kg, 1.0)
        mass_multiplier = (user_weight + add_weight) / user_weight
        
        base_rep_met = item["met"]
        active_met = base_rep_met * mass_multiplier
        rest_met = 3.0  # Resting recovery MET between sets
        
        # 4. Session Weighted Average MET
        total_session_mins = max(duration_mins, 0.1)
        met_val = round(((active_met * active_mins) + (rest_met * rest_mins)) / total_session_mins, 2)
        
        weight_note = f" + {add_weight} kg weight" if add_weight > 0 else ""
        notes = f"{sets} sets × {reps} reps ({total_reps} total reps{weight_note})"

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

    workout_in = WorkoutLogCreate(
        exercise_name=exercise_name,
        duration_minutes=round(duration_mins, 1),
        met_value=met_val,
        additional_weight_kg=add_weight,
        input_method="structured_catalog",
        notes=notes,
    )
    return create_workout_entry(db=db, user=user, workout_in=workout_in)





def get_user_today_workouts(db: Session, user: UserAuth) -> List[WorkoutLog]:
    """Retrieves all workouts logged today by the user.

    Args:
        db: Database session.
        user: Authenticated UserAuth entity.

    Returns:
        List of WorkoutLog model instances.
    """
    today_start = datetime.combine(date.today(), time.min)
    today_end = datetime.combine(date.today(), time.max)

    return (
        db.query(WorkoutLog)
        .filter(
            WorkoutLog.user_id == user.id,
            WorkoutLog.logged_at >= today_start,
            WorkoutLog.logged_at <= today_end,
        )
        .order_by(WorkoutLog.logged_at.desc())
        .all()
    )


def calculate_user_today_workout_summary(db: Session, user: UserAuth) -> DailyWorkoutSummary:
    """Calculates today's total workouts count, total duration, and total net calories burned.

    Args:
        db: Database session.
        user: Authenticated UserAuth entity.

    Returns:
        DailyWorkoutSummary instance.
    """
    today_start = datetime.combine(date.today(), time.min)
    today_end = datetime.combine(date.today(), time.max)

    workouts = (
        db.query(WorkoutLog)
        .filter(
            WorkoutLog.user_id == user.id,
            WorkoutLog.logged_at >= today_start,
            WorkoutLog.logged_at <= today_end,
        )
        .all()
    )

    total_duration = sum(w.duration_minutes for w in workouts)
    total_burn = sum(w.calories_burned for w in workouts)
    workout_responses = [WorkoutLogResponse.model_validate(w) for w in workouts]

    return DailyWorkoutSummary(
        total_workouts=len(workouts),
        total_duration_minutes=round(total_duration, 1),
        total_net_calories_burned=total_burn,
        workouts_logged_today=workout_responses,
    )


def delete_workout_entry(db: Session, user: UserAuth, workout_id: str) -> bool:
    """Deletes a logged workout entry owned by authenticated user.

    Args:
        db: Database session.
        user: Authenticated UserAuth entity.
        workout_id: UUID of workout log.

    Returns:
        True if deleted successfully.

    Raises:
        HTTPException: If workout entry is not found.
    """
    workout = db.query(WorkoutLog).filter(WorkoutLog.id == workout_id, WorkoutLog.user_id == user.id).first()
    if not workout:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout entry not found or unauthorized.",
        )

    db.delete(workout)
    db.commit()
    return True


def update_workout_entry(db: Session, user: UserAuth, workout_id: str, workout_in: WorkoutLogCreate) -> WorkoutLog:
    """Updates an existing logged workout entry and recalculates Net MET calories burned.

    Args:
        db: Database session.
        user: Authenticated UserAuth entity.
        workout_id: UUID of workout log.
        workout_in: Updated workout values.

    Returns:
        Updated WorkoutLog model instance.
    """
    profile = user.profile
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Physical profile not found.",
        )

    workout = db.query(WorkoutLog).filter(WorkoutLog.id == workout_id, WorkoutLog.user_id == user.id).first()
    if not workout:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout entry not found or unauthorized.",
        )

    net_calories_burned = calculate_net_exercise_calories(
        met=workout_in.met_value,
        weight_kg=profile.weight_kg,
        duration_minutes=workout_in.duration_minutes,
        activity_level=profile.activity_level,
    )

    workout.exercise_name = workout_in.exercise_name
    workout.duration_minutes = workout_in.duration_minutes
    workout.met_value = workout_in.met_value
    workout.calories_burned = net_calories_burned
    if workout_in.notes is not None:
        workout.notes = workout_in.notes

    db.commit()
    db.refresh(workout)
    return workout


DEFAULT_WEEKLY_SCHEDULE = [
    {"day": "monday", "activity_type": "gym", "targets": ["chest", "triceps"], "is_completed": False},
    {"day": "tuesday", "activity_type": "gym", "targets": ["back", "biceps"], "is_completed": False},
    {"day": "wednesday", "activity_type": "sports", "targets": ["football"], "is_completed": False},
    {"day": "thursday", "activity_type": "gym", "targets": ["quads", "hamstrings", "glutes"], "is_completed": False},
    {"day": "friday", "activity_type": "gym", "targets": ["shoulders", "abs"], "is_completed": False},
    {"day": "saturday", "activity_type": "cardio", "targets": ["walking"], "is_completed": False},
    {"day": "sunday", "activity_type": "rest", "targets": [], "is_completed": False},
]


def get_user_workout_plan(db: Session, user: UserAuth) -> WorkoutPlanResponse:
    """Retrieves authenticated user's weekly routine blueprint and fitness focus protein thresholds."""
    profile = user.profile
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Physical profile not found.")

    focus_key = (profile.fitness_focus or "athletic").lower()
    focus_cfg = FITNESS_FOCUS_CONFIG.get(focus_key, FITNESS_FOCUS_CONFIG["athletic"])

    raw_schedule = DEFAULT_WEEKLY_SCHEDULE
    if profile.weekly_schedule_json:
        try:
            import json
            raw_schedule = json.loads(profile.weekly_schedule_json)
        except Exception:
            raw_schedule = DEFAULT_WEEKLY_SCHEDULE

    schedule_items = [DayScheduleItem(**item) for item in raw_schedule]

    base_p_per_kg = focus_cfg["base_protein_per_kg"]
    max_p_per_kg = focus_cfg["max_protein_per_kg"]
    weight = profile.weight_kg

    return WorkoutPlanResponse(
        fitness_focus=focus_key,
        weekly_schedule=schedule_items,
        base_protein_g_per_kg=base_p_per_kg,
        max_protein_cap_g_per_kg=max_p_per_kg,
        user_weight_kg=weight,
        calculated_base_protein_g=round(weight * base_p_per_kg, 1),
        calculated_max_protein_cap_g=round(weight * max_p_per_kg, 1),
    )


def update_user_workout_plan(db: Session, user: UserAuth, plan_in: WorkoutPlanUpdate) -> WorkoutPlanResponse:
    """Updates user's fitness focus and weekly schedule blueprint."""
    import json
    profile = user.profile
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Physical profile not found.")

    focus_key = (plan_in.fitness_focus or "athletic").lower()
    if focus_key not in FITNESS_FOCUS_CONFIG:
        focus_key = "athletic"

    profile.fitness_focus = focus_key
    profile.weekly_schedule_json = json.dumps([item.model_dump() for item in plan_in.schedule])

    from app.core.formulas import calculate_target_budgets
    new_targets = calculate_target_budgets(
        weight_kg=profile.weight_kg,
        height_cm=profile.height_cm,
        birth_date=profile.birth_date,
        gender=profile.gender,
        target_weight_kg=profile.target_weight_kg,
        timeline_weeks=profile.timeline_weeks,
        activity_level=profile.activity_level,
        fitness_focus=focus_key,
    )
    profile.calculated_protein_target_g = new_targets["calculated_protein_target_g"]
    profile.calculated_carb_target_g = new_targets["calculated_carb_target_g"]
    profile.calculated_fat_target_g = new_targets["calculated_fat_target_g"]

    db.commit()
    db.refresh(profile)
    return get_user_workout_plan(db, user)


def toggle_workout_plan_day(db: Session, user: UserAuth, day: str) -> WorkoutPlanResponse:
    """Toggles manual 1-tap completion status for a specific day in the weekly plan."""
    import json
    profile = user.profile
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Physical profile not found.")

    raw_schedule = DEFAULT_WEEKLY_SCHEDULE
    if profile.weekly_schedule_json:
        try:
            raw_schedule = json.loads(profile.weekly_schedule_json)
        except Exception:
            raw_schedule = DEFAULT_WEEKLY_SCHEDULE

    day_lower = day.lower()
    for item in raw_schedule:
        if item.get("day", "").lower() == day_lower:
            item["is_completed"] = not item.get("is_completed", False)
            break

    profile.weekly_schedule_json = json.dumps(raw_schedule)
    db.commit()
    db.refresh(profile)
    return get_user_workout_plan(db, user)

