"""Analytics domain service module handling historical performance calculations and day-detail reporting."""

from datetime import date, datetime, time, timedelta
from typing import List, Dict, Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.db.models.nutrition_log import FoodLog
from app.db.models.workout_log import WorkoutLog
from app.db.models.user_auth import UserAuth
from app.schemas.nutrition_log import FoodLogResponse
from app.schemas.workout_log import WorkoutLogResponse
from app.schemas.analytics import AnalyticsHistoryResponse, DailyHistorySnapshot, DayDetailResponse, DayDetailMealItem, DayDetailWorkoutItem


def get_user_nutrition_history(db: Session, user: UserAuth, days: int = 30) -> AnalyticsHistoryResponse:
    """Calculates daily historical performance snapshots evaluating calorie & protein goals.

    Args:
        db: Database session.
        user: Authenticated UserAuth entity.
        days: Number of past days to query (default 30).

    Returns:
        List of DailyHistorySnapshot objects.
    """
    profile = user.profile
    if not profile:
        return []

    goal_type = profile.goal_type
    today = date.today()
    start_date = today - timedelta(days=days - 1)

    history = []
    for d in range(days):
        current_date = start_date + timedelta(days=d)
        d_start = datetime.combine(current_date, time.min)
        d_end = datetime.combine(current_date, time.max)

        meals = (
            db.query(FoodLog)
            .filter(
                FoodLog.user_id == user.id,
                FoodLog.logged_at >= d_start,
                FoodLog.logged_at <= d_end,
            )
            .all()
        )

        workouts = (
            db.query(WorkoutLog)
            .filter(
                WorkoutLog.user_id == user.id,
                WorkoutLog.logged_at >= d_start,
                WorkoutLog.logged_at <= d_end,
            )
            .all()
        )

        consumed_cals = sum(m.calories for m in meals)
        consumed_protein = sum(m.protein_g for m in meals)
        exercise_burn = sum(w.calories_burned for w in workouts)

        adjusted_target = profile.calculated_calorie_target + exercise_burn
        target_protein = profile.calculated_protein_target_g

        is_goal_hit = False
        reason = ""

        if len(meals) == 0 and len(workouts) == 0:
            is_goal_hit = False
            reason = "No meals or workouts logged on this date."
        elif goal_type == "lose_weight":
            hit_cals = consumed_cals <= adjusted_target
            hit_protein = consumed_protein >= target_protein
            is_goal_hit = hit_cals and hit_protein
            if is_goal_hit:
                reason = f"Hit protein goal ({consumed_protein}g / {target_protein}g) & stayed under calorie budget ({consumed_cals} / {adjusted_target} kcal)."
            elif not hit_cals:
                reason = f"Exceeded calorie limit ({consumed_cals} / {adjusted_target} kcal)."
            else:
                reason = f"Missed protein target ({consumed_protein}g / {target_protein}g)."
        elif goal_type == "gain_muscle":
            hit_cals = consumed_cals >= adjusted_target
            hit_protein = consumed_protein >= target_protein
            is_goal_hit = hit_cals and hit_protein
            if is_goal_hit:
                reason = f"Hit protein goal ({consumed_protein}g / {target_protein}g) & met surplus target ({consumed_cals} / {adjusted_target} kcal)."
            elif not hit_cals:
                reason = f"Below calorie surplus target ({consumed_cals} / {adjusted_target} kcal)."
            else:
                reason = f"Missed protein target ({consumed_protein}g / {target_protein}g)."
        else:
            hit_cals = abs(consumed_cals - adjusted_target) <= 150
            hit_protein = consumed_protein >= target_protein
            is_goal_hit = hit_cals and hit_protein
            reason = f"Consumed {consumed_cals} kcal vs {adjusted_target} target."

        history.append(
            DailyHistorySnapshot(
                date=current_date.strftime("%Y-%m-%d"),
                goal_type=goal_type,
                adjusted_calorie_target=adjusted_target,
                consumed_calories=consumed_cals,
                target_protein_g=target_protein,
                consumed_protein_g=round(consumed_protein, 1),
                is_goal_hit=is_goal_hit,
                status_reason=reason,
            )
        )

    # 1. Total goals hit
    total_goals_hit_30d = sum(1 for snap in history if snap.is_goal_hit)

    # 2. Best streak calculation
    best_streak = 0
    running_streak = 0
    for snap in history:
        if snap.is_goal_hit:
            running_streak += 1
            best_streak = max(best_streak, running_streak)
        else:
            running_streak = 0

    # 3. Current active streak calculation (backwards from today/yesterday)
    current_streak = 0
    if history:
        # Start checking from today (history[-1])
        idx = len(history) - 1
        if not history[idx].is_goal_hit and idx > 0 and history[idx - 1].is_goal_hit:
            # Today not hit yet, but yesterday was hit -> streak is alive from yesterday
            idx -= 1

        while idx >= 0 and history[idx].is_goal_hit:
            current_streak += 1
            idx -= 1

    return AnalyticsHistoryResponse(
        snapshots=history,
        current_streak=current_streak,
        best_streak=best_streak,
        total_goals_hit_30d=total_goals_hit_30d,
    )


def get_day_detail_summary(db: Session, user: UserAuth, target_date_str: str) -> dict:
    """Retrieves full detailed food & exercise logs for a specific date.

    Args:
        db: Database session.
        user: Authenticated UserAuth entity.
        target_date_str: Date string formatted as YYYY-MM-DD.

    Returns:
        Dict containing date, meals, workouts, totals, and goal status.
    """
    profile = user.profile
    if not profile:
        raise HTTPException(status_code=404, detail="User profile not found")

    try:
        t_date = datetime.strptime(target_date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    d_start = datetime.combine(t_date, time.min)
    d_end = datetime.combine(t_date, time.max)

    meals = (
        db.query(FoodLog)
        .filter(FoodLog.user_id == user.id, FoodLog.logged_at >= d_start, FoodLog.logged_at <= d_end)
        .order_by(FoodLog.logged_at.asc())
        .all()
    )

    workouts = (
        db.query(WorkoutLog)
        .filter(WorkoutLog.user_id == user.id, WorkoutLog.logged_at >= d_start, WorkoutLog.logged_at <= d_end)
        .order_by(WorkoutLog.logged_at.asc())
        .all()
    )

    consumed_cals = sum(m.calories for m in meals)
    consumed_protein = sum(m.protein_g for m in meals)
    consumed_carbs = sum(m.carbs_g for m in meals)
    consumed_fat = sum(m.fat_g for m in meals)

    exercise_burn = sum(w.calories_burned for w in workouts)

    base_target = profile.calculated_calorie_target
    adjusted_target = base_target + exercise_burn
    remaining_cals = adjusted_target - consumed_cals

    goal_type = profile.goal_type
    target_protein = profile.calculated_protein_target_g

    is_goal_hit = False
    reason = ""

    if len(meals) == 0 and len(workouts) == 0:
        is_goal_hit = False
        reason = "No meals or workouts logged on this date."
    elif goal_type == "lose_weight":
        hit_cals = consumed_cals <= adjusted_target
        hit_protein = consumed_protein >= target_protein
        is_goal_hit = hit_cals and hit_protein
        if is_goal_hit:
            reason = f"Hit protein goal ({consumed_protein:.1f}g / {target_protein}g) & stayed under calorie budget ({consumed_cals} / {adjusted_target} kcal)."
        elif not hit_cals:
            reason = f"Exceeded calorie limit ({consumed_cals} / {adjusted_target} kcal)."
        else:
            reason = f"Missed protein target ({consumed_protein:.1f}g / {target_protein}g)."
    elif goal_type == "gain_muscle":
        hit_cals = consumed_cals >= adjusted_target
        hit_protein = consumed_protein >= target_protein
        is_goal_hit = hit_cals and hit_protein
        if is_goal_hit:
            reason = f"Hit protein goal ({consumed_protein:.1f}g / {target_protein}g) & met surplus target ({consumed_cals} / {adjusted_target} kcal)."
        elif not hit_cals:
            reason = f"Below calorie surplus target ({consumed_cals} / {adjusted_target} kcal)."
        else:
            reason = f"Missed protein target ({consumed_protein:.1f}g / {target_protein}g)."
    else:
        hit_cals = abs(consumed_cals - adjusted_target) <= 150
        hit_protein = consumed_protein >= target_protein
        is_goal_hit = hit_cals and hit_protein
        reason = f"Consumed {consumed_cals} kcal vs {adjusted_target} target."

    return DayDetailResponse(
        date=target_date_str,
        goal_type=goal_type,
        base_calorie_target=base_target,
        exercise_net_calories_burned=exercise_burn,
        adjusted_calorie_target=adjusted_target,
        consumed_calories=consumed_cals,
        remaining_calories=remaining_cals,
        target_protein_g=target_protein,
        consumed_protein_g=round(consumed_protein, 1),
        target_carb_g=profile.calculated_carb_target_g,
        consumed_carb_g=round(consumed_carbs, 1),
        target_fat_g=profile.calculated_fat_target_g,
        consumed_fat_g=round(consumed_fat, 1),
        is_goal_hit=is_goal_hit,
        status_reason=reason,
        meals=[
            DayDetailMealItem(
                id=m.id,
                meal_type=m.meal_type,
                description=m.description,
                calories=m.calories,
                protein_g=m.protein_g,
                carbs_g=m.carbs_g,
                fat_g=m.fat_g,
                time=m.logged_at.strftime("%I:%M %p"),
            )
            for m in meals
        ],
        workouts=[
            DayDetailWorkoutItem(
                id=w.id,
                exercise_name=w.exercise_name,
                duration_minutes=w.duration_minutes,
                calories_burned=w.calories_burned,
                time=w.logged_at.strftime("%I:%M %p"),
            )
            for w in workouts
        ],
    )
