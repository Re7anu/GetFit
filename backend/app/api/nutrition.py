"""Nutrition API endpoints module for meal logging and daily budget tracking."""

from datetime import date, datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.auth_dependencies import get_current_user
from app.db.models.food_log import FoodLog
from app.db.models.user_auth import UserAuth
from app.db.session import get_db
from app.schemas.food_log import DailyNutritionSummary, FoodLogCreate, FoodLogResponse

router = APIRouter()


@router.post("/meals", response_model=FoodLogResponse, status_code=status.HTTP_201_CREATED)
def log_meal(
    meal_in: FoodLogCreate,
    current_user: UserAuth = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Logs a new food or meal entry for the current user.

    Args:
        meal_in: Meal creation payload containing meal_type, description, calories, and macros.
        current_user: Authenticated UserAuth model instance.
        db: Database session instance.

    Returns:
        Created FoodLog model instance.
    """
    db_meal = FoodLog(
        user_id=current_user.id,
        meal_type=meal_in.meal_type,
        description=meal_in.description,
        calories=meal_in.calories,
        protein_g=meal_in.protein_g,
        carbs_g=meal_in.carbs_g,
        fat_g=meal_in.fat_g,
        quantity_g=meal_in.quantity_g,
        input_method=meal_in.input_method,
    )
    db.add(db_meal)
    db.commit()
    db.refresh(db_meal)
    return db_meal


@router.get("/meals/today", response_model=List[FoodLogResponse])
def read_today_meals(
    current_user: UserAuth = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves all meal logs recorded by the current user today.

    Args:
        current_user: Authenticated UserAuth model instance.
        db: Database session instance.

    Returns:
        List of FoodLogResponse entries.
    """
    today_start = datetime.combine(date.today(), datetime.min.time())
    today_end = datetime.combine(date.today(), datetime.max.time())

    meals = (
        db.query(FoodLog)
        .filter(
            FoodLog.user_id == current_user.id,
            FoodLog.logged_at >= today_start,
            FoodLog.logged_at <= today_end,
        )
        .order_by(FoodLog.logged_at.desc())
        .all()
    )
    return meals


@router.get("/summary/today", response_model=DailyNutritionSummary)
def read_today_nutrition_summary(
    current_user: UserAuth = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Calculates today's consumed calories and macros against the user's target budget.

    Args:
        current_user: Authenticated UserAuth model instance.
        db: Database session instance.

    Returns:
        DailyNutritionSummary showing totals, remaining budget, and macro splits.
    """
    profile = current_user.profile
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not set up.")

    today_start = datetime.combine(date.today(), datetime.min.time())
    today_end = datetime.combine(date.today(), datetime.max.time())

    # Aggregate today's food entries
    summary = (
        db.query(
            func.coalesce(func.sum(FoodLog.calories), 0).label("calories"),
            func.coalesce(func.sum(FoodLog.protein_g), 0.0).label("protein"),
            func.coalesce(func.sum(FoodLog.carbs_g), 0.0).label("carbs"),
            func.coalesce(func.sum(FoodLog.fat_g), 0.0).label("fat"),
        )
        .filter(
            FoodLog.user_id == current_user.id,
            FoodLog.logged_at >= today_start,
            FoodLog.logged_at <= today_end,
        )
        .first()
    )

    calories_consumed = int(summary.calories)
    protein_consumed = float(summary.protein)
    carbs_consumed = float(summary.carbs)
    fat_consumed = float(summary.fat)

    calorie_target = profile.calculated_calorie_target
    calories_remaining = calorie_target - calories_consumed

    return DailyNutritionSummary(
        date=date.today().isoformat(),
        calorie_target=calorie_target,
        calories_consumed=calories_consumed,
        calories_remaining=calories_remaining,
        protein_target_g=profile.calculated_protein_target_g,
        protein_consumed_g=round(protein_consumed, 1),
        carbs_target_g=profile.calculated_carb_target_g,
        carbs_consumed_g=round(carbs_consumed, 1),
        fat_target_g=profile.calculated_fat_target_g,
        fat_consumed_g=round(fat_consumed, 1),
    )
