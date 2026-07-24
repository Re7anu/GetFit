"""Nutrition domain service module handling meal logging and daily budget calculations."""

from datetime import date, datetime, time
from typing import List
from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.db.models.exercise_log import ExerciseLog
from app.db.models.food_log import FoodLog
from app.db.models.user_auth import UserAuth
from app.schemas.food_log import AIFoodParseRequest, DailyNutritionSummary, FoodLogCreate, FoodLogResponse


def create_meal_entry(db: Session, user: UserAuth, meal_in: FoodLogCreate) -> FoodLog:
    """Creates and persists a new meal entry for the user.

    Args:
        db: Database session.
        user: Authenticated UserAuth entity.
        meal_in: Food logging payload.

    Returns:
        Created FoodLog model instance.
    """
    db_meal = FoodLog(
        user_id=user.id,
        meal_type=meal_in.meal_type.lower(),
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


def create_meal_entry_via_ai(db: Session, user: UserAuth, prompt_in: AIFoodParseRequest) -> FoodLog:
    """Parses natural language meal text using Gemini AI and creates a new FoodLog entry.

    Args:
        db: Database session.
        user: Authenticated UserAuth entity.
        prompt_in: AI food parse request payload containing text_prompt.

    Returns:
        Created FoodLog model instance.
    """
    from app.services.gemini_service import parse_food_description

    ai_parsed = parse_food_description(prompt_in.text_prompt)

    meal_in = FoodLogCreate(
        meal_type=ai_parsed.get("meal_type", "snack"),
        description=ai_parsed.get("description", prompt_in.text_prompt),
        calories=ai_parsed.get("calories", 0),
        protein_g=ai_parsed.get("protein_g", 0.0),
        carbs_g=ai_parsed.get("carbs_g", 0.0),
        fat_g=ai_parsed.get("fat_g", 0.0),
        quantity_g=ai_parsed.get("quantity_g"),
        input_method="ai_nlp",
    )
    return create_meal_entry(db=db, user=user, meal_in=meal_in)


def get_user_today_meals(db: Session, user: UserAuth) -> List[FoodLog]:
    """Retrieves all meals logged today by the user.

    Args:
        db: Database session.
        user: Authenticated UserAuth entity.

    Returns:
        List of FoodLog model instances.
    """
    today_start = datetime.combine(date.today(), time.min)
    today_end = datetime.combine(date.today(), time.max)

    return (
        db.query(FoodLog)
        .filter(
            FoodLog.user_id == user.id,
            FoodLog.logged_at >= today_start,
            FoodLog.logged_at <= today_end,
        )
        .order_by(FoodLog.logged_at.desc())
        .all()
    )


def calculate_user_today_nutrition_summary(db: Session, user: UserAuth) -> DailyNutritionSummary:
    """Calculates today's consumed calories/macros vs adjusted target budget incorporating Net MET exercise credits.

    Args:
        db: Database session.
        user: Authenticated UserAuth entity.

    Returns:
        DailyNutritionSummary instance.

    Raises:
        HTTPException: If user profile is not found.
    """
    profile = user.profile
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Physical profile not found. Please complete profile onboarding via POST /profiles.",
        )

    today_start = datetime.combine(date.today(), time.min)
    today_end = datetime.combine(date.today(), time.max)

    # 1. Fetch today's logged meals
    meals = (
        db.query(FoodLog)
        .filter(
            FoodLog.user_id == user.id,
            FoodLog.logged_at >= today_start,
            FoodLog.logged_at <= today_end,
        )
        .all()
    )

    consumed_cals = sum(m.calories for m in meals)
    consumed_protein = sum(m.protein_g for m in meals)
    consumed_carbs = sum(m.carbs_g for m in meals)
    consumed_fat = sum(m.fat_g for m in meals)

    # 2. Fetch today's Net MET exercise calories burned
    exercise_burn = (
        db.query(func.coalesce(func.sum(ExerciseLog.calories_burned), 0))
        .filter(
            ExerciseLog.user_id == user.id,
            ExerciseLog.logged_at >= today_start,
            ExerciseLog.logged_at <= today_end,
        )
        .scalar()
    )

    base_target = profile.calculated_calorie_target
    adjusted_target = base_target + exercise_burn
    remaining_cals = adjusted_target - consumed_cals

    # Format meal responses for Pydantic serialization
    meal_responses = [FoodLogResponse.model_validate(m) for m in meals]

    return DailyNutritionSummary(
        base_calorie_target=base_target,
        exercise_net_calories_burned=exercise_burn,
        adjusted_calorie_target=adjusted_target,
        consumed_calories=consumed_cals,
        remaining_calories=remaining_cals,
        target_protein_g=profile.calculated_protein_target_g,
        consumed_protein_g=round(consumed_protein, 1),
        target_carb_g=profile.calculated_carb_target_g,
        consumed_carb_g=round(consumed_carbs, 1),
        target_fat_g=profile.calculated_fat_target_g,
        consumed_fat_g=round(consumed_fat, 1),
        meals_logged_today=meal_responses,
    )
