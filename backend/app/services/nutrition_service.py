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
    """Parses natural language meal text using Gemini AI response_schema and creates a new FoodLog entry.

    Args:
        db: Database session.
        user: Authenticated UserAuth entity.
        prompt_in: AI food parse request payload containing text_prompt.

    Returns:
        Created FoodLog model instance.
    """
    from app.core.prompts import FOOD_PARSING_PROMPT_TEMPLATE
    from app.schemas.food_log import AIFoodParseResult
    from app.services import gemini_service

    prompt = FOOD_PARSING_PROMPT_TEMPLATE.format(text_prompt=prompt_in.text_prompt)
    parsed_result: AIFoodParseResult = gemini_service.generate_structured_output(
        prompt=prompt,
        response_schema=AIFoodParseResult,
    )

    meal_in = FoodLogCreate(
        meal_type=parsed_result.meal_type,
        description=parsed_result.description,
        calories=parsed_result.calories,
        protein_g=parsed_result.protein_g,
        carbs_g=parsed_result.carbs_g,
        fat_g=parsed_result.fat_g,
        quantity_g=parsed_result.quantity_g,
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

    # Activity-Specific Sports Nutrition Macro Recovery Allocation Engine
    today_workouts = (
        db.query(ExerciseLog)
        .filter(
            ExerciseLog.user_id == user.id,
            ExerciseLog.logged_at >= today_start,
            ExerciseLog.logged_at <= today_end,
        )
        .all()
    )

    cardio_burn = 0
    strength_burn = 0
    general_burn = 0

    from app.core.exercise_catalog import EXERCISE_CATALOG

    for w in today_workouts:
        # Match exercise catalog category or fallback based on name
        matched_cat = "general"
        name_lower = w.exercise_name.lower()
        for cat_id, cat_info in EXERCISE_CATALOG.items():
            if cat_info["name"].lower() in name_lower or cat_id in name_lower:
                matched_cat = cat_info["category"]
                break
        
        if matched_cat == "distance" or any(k in name_lower for k in ["run", "cycle", "swim", "row", "walk", "hiit", "soccer"]):
            cardio_burn += w.calories_burned
        elif matched_cat == "reps" or any(k in name_lower for k in ["push", "pull", "squat", "bench", "lift", "press", "curl", "lunge", "dip", "crunch", "burpee"]):
            strength_burn += w.calories_burned
        else:
            general_burn += w.calories_burned

    # Calculate specific recovery macro additions (in grams)
    extra_protein_g = ((strength_burn * 0.50) + (cardio_burn * 0.20) + (general_burn * 0.30)) / 4.0
    extra_carbs_g = ((cardio_burn * 0.65) + (strength_burn * 0.35) + (general_burn * 0.40)) / 4.0
    extra_fat_g = ((cardio_burn * 0.15) + (strength_burn * 0.15) + (general_burn * 0.30)) / 9.0

    adj_target_protein = round(profile.calculated_protein_target_g + extra_protein_g, 1)
    adj_target_carb = round(profile.calculated_carb_target_g + extra_carbs_g, 1)
    adj_target_fat = round(profile.calculated_fat_target_g + extra_fat_g, 1)

    # Format meal responses for Pydantic serialization
    meal_responses = [FoodLogResponse.model_validate(m) for m in meals]

    return DailyNutritionSummary(
        base_calorie_target=base_target,
        exercise_net_calories_burned=exercise_burn,
        adjusted_calorie_target=adjusted_target,
        consumed_calories=consumed_cals,
        remaining_calories=remaining_cals,
        target_protein_g=adj_target_protein,
        consumed_protein_g=round(consumed_protein, 1),
        target_carb_g=adj_target_carb,
        consumed_carb_g=round(consumed_carbs, 1),
        target_fat_g=adj_target_fat,
        consumed_fat_g=round(consumed_fat, 1),
        meals_logged_today=meal_responses,
    )


def delete_meal_entry(db: Session, user: UserAuth, meal_id: str) -> bool:
    """Deletes a logged meal entry owned by authenticated user.

    Args:
        db: Database session.
        user: Authenticated UserAuth entity.
        meal_id: UUID of meal log.

    Returns:
        True if deleted successfully.

    Raises:
        HTTPException: If meal entry is not found.
    """
    meal = db.query(FoodLog).filter(FoodLog.id == meal_id, FoodLog.user_id == user.id).first()
    if not meal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal entry not found or unauthorized.",
        )

    db.delete(meal)
    db.commit()
    return True


def update_meal_entry(db: Session, user: UserAuth, meal_id: str, meal_in: FoodLogCreate) -> FoodLog:
    """Updates an existing logged meal entry.

    Args:
        db: Database session.
        user: Authenticated UserAuth entity.
        meal_id: UUID of meal log.
        meal_in: Updated meal values.

    Returns:
        Updated FoodLog model instance.
    """
    meal = db.query(FoodLog).filter(FoodLog.id == meal_id, FoodLog.user_id == user.id).first()
    if not meal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal entry not found or unauthorized.",
        )

    meal.meal_type = meal_in.meal_type.lower()
    meal.description = meal_in.description
    meal.calories = meal_in.calories
    meal.protein_g = meal_in.protein_g
    meal.carbs_g = meal_in.carbs_g
    meal.fat_g = meal_in.fat_g
    if meal_in.quantity_g is not None:
        meal.quantity_g = meal_in.quantity_g

    db.commit()
    db.refresh(meal)
    return meal
