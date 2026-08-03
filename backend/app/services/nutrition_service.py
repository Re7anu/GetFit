"""Nutrition domain service module handling meal logging and daily budget calculations."""

from datetime import date, datetime, time
from typing import List
from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.constants import FITNESS_FOCUS_CONFIG
from app.core.exercise_catalog import EXERCISE_CATALOG
from app.core.formulas import calculate_workout_macro_additions
from app.core.prompts import (
    FOOD_IMAGE_PARSING_PROMPT,
    FOOD_PARSING_PROMPT_TEMPLATE,
    MICRONUTRIENT_ENRICHMENT_PROMPT,
)
from app.db.models.workout_log import WorkoutLog
from app.db.models.nutrition_log import FoodLog
from app.db.models.user_auth import UserAuth
from app.schemas.nutrition_log import AIFoodParseRequest, AIFoodParseResult, DailyNutritionSummary, FoodLogCreate, FoodLogResponse
from app.services import gemini_service


def create_meal_entry(db: Session, user: UserAuth, meal_in: FoodLogCreate) -> FoodLog:
    """Creates and persists a new meal entry for the user.
    If micronutrients are left at 0 in manual mode, automatically enriches them via AI.
    """
    fiber_g = meal_in.fiber_g
    sodium_mg = meal_in.sodium_mg
    potassium_mg = meal_in.potassium_mg
    vitamin_c_mg = meal_in.vitamin_c_mg
    calcium_mg = meal_in.calcium_mg
    iron_mg = meal_in.iron_mg

    # Automatic Micronutrient Enrichment if all micros are 0
    if fiber_g == 0 and sodium_mg == 0 and potassium_mg == 0 and vitamin_c_mg == 0 and calcium_mg == 0 and iron_mg == 0:
        try:
            prompt = MICRONUTRIENT_ENRICHMENT_PROMPT.format(
                description=meal_in.description,
                meal_type=meal_in.meal_type,
                calories=meal_in.calories,
                protein_g=meal_in.protein_g,
                carbs_g=meal_in.carbs_g,
                fat_g=meal_in.fat_g,
            )
            parsed: AIFoodParseResult = gemini_service.generate_structured_output(
                prompt=prompt,
                response_schema=AIFoodParseResult,
            )
            fiber_g = parsed.fiber_g
            sodium_mg = parsed.sodium_mg
            potassium_mg = parsed.potassium_mg
            vitamin_c_mg = parsed.vitamin_c_mg
            calcium_mg = parsed.calcium_mg
            iron_mg = parsed.iron_mg
        except Exception:
            # Fallback estimation based on macro ratios if AI call fails
            fiber_g = round(meal_in.carbs_g * 0.08, 1)
            sodium_mg = round(meal_in.calories * 0.8, 1)
            potassium_mg = round(meal_in.calories * 1.1, 1)
            calcium_mg = round(meal_in.protein_g * 4.0, 1)

    db_meal = FoodLog(
        user_id=user.id,
        meal_type=meal_in.meal_type.lower(),
        description=meal_in.description,
        calories=meal_in.calories,
        protein_g=meal_in.protein_g,
        carbs_g=meal_in.carbs_g,
        fat_g=meal_in.fat_g,
        fiber_g=fiber_g,
        sodium_mg=sodium_mg,
        potassium_mg=potassium_mg,
        vitamin_c_mg=vitamin_c_mg,
        calcium_mg=calcium_mg,
        iron_mg=iron_mg,
        quantity_g=meal_in.quantity_g,
        input_method=meal_in.input_method,
    )
    db.add(db_meal)
    db.commit()
    db.refresh(db_meal)
    return db_meal


def create_meal_entry_via_ai(db: Session, user: UserAuth, prompt_in: AIFoodParseRequest) -> FoodLog:
    """Parses natural language meal text using Gemini AI response_schema and creates a new FoodLog entry."""
    prompt = FOOD_PARSING_PROMPT_TEMPLATE.format(text_prompt=prompt_in.text_prompt)
    parsed_result: AIFoodParseResult = gemini_service.generate_structured_output(
        prompt=prompt,
        response_schema=AIFoodParseResult,
    )

    desc_lower = (parsed_result.description or "").lower()
    if getattr(parsed_result, "is_food_item", True) is False or parsed_result.calories == 0 or "no food" in desc_lower or "not food" in desc_lower:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No edible food item detected. ({parsed_result.description})",
        )

    meal_in = FoodLogCreate(
        meal_type=parsed_result.meal_type,
        description=parsed_result.description,
        calories=parsed_result.calories,
        protein_g=parsed_result.protein_g,
        carbs_g=parsed_result.carbs_g,
        fat_g=parsed_result.fat_g,
        fiber_g=parsed_result.fiber_g,
        sodium_mg=parsed_result.sodium_mg,
        potassium_mg=parsed_result.potassium_mg,
        vitamin_c_mg=parsed_result.vitamin_c_mg,
        calcium_mg=parsed_result.calcium_mg,
        iron_mg=parsed_result.iron_mg,
        quantity_g=parsed_result.quantity_g,
        input_method="ai_nlp",
    )
    return create_meal_entry(db=db, user=user, meal_in=meal_in)


def create_meal_entry_via_image_ai(
    db: Session,
    user: UserAuth,
    image_bytes: bytes,
    mime_type: str,
    meal_type_hint: str = None,
    notes: str = None,
) -> FoodLog:
    """Parses a food image using Gemini Vision AI structured output and creates a new FoodLog entry."""
    hint = meal_type_hint or "Infer appropriate meal type from visual context"
    user_notes = notes or "None provided"
    prompt = FOOD_IMAGE_PARSING_PROMPT.format(meal_hint=hint, user_notes=user_notes)
    
    parsed_result: AIFoodParseResult = gemini_service.generate_multimodal_structured_output(
        image_bytes=image_bytes,
        mime_type=mime_type,
        prompt=prompt,
        response_schema=AIFoodParseResult,
    )

    desc_lower = (parsed_result.description or "").lower()
    if (
        getattr(parsed_result, "is_food_item", True) is False
        or parsed_result.calories == 0
        or "no food" in desc_lower
        or "not food" in desc_lower
        or "non-food" in desc_lower
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No edible food item detected. ({parsed_result.description})",
        )

    meal_type = meal_type_hint if meal_type_hint and meal_type_hint.lower() in ["breakfast", "lunch", "dinner", "snack"] else parsed_result.meal_type

    meal_in = FoodLogCreate(
        meal_type=meal_type,
        description=parsed_result.description,
        calories=parsed_result.calories,
        protein_g=parsed_result.protein_g,
        carbs_g=parsed_result.carbs_g,
        fat_g=parsed_result.fat_g,
        fiber_g=parsed_result.fiber_g,
        sodium_mg=parsed_result.sodium_mg,
        potassium_mg=parsed_result.potassium_mg,
        vitamin_c_mg=parsed_result.vitamin_c_mg,
        calcium_mg=parsed_result.calcium_mg,
        iron_mg=parsed_result.iron_mg,
        quantity_g=parsed_result.quantity_g,
        input_method="ai_vision",
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
    
    # Sum micronutrients
    consumed_fiber = sum(m.fiber_g for m in meals)
    consumed_sodium = sum(m.sodium_mg for m in meals)
    consumed_potassium = sum(m.potassium_mg for m in meals)
    consumed_vitamin_c = sum(m.vitamin_c_mg for m in meals)
    consumed_calcium = sum(m.calcium_mg for m in meals)
    consumed_iron = sum(m.iron_mg for m in meals)

    # 2. Fetch today's Net MET exercise calories burned
    exercise_burn = (
        db.query(func.coalesce(func.sum(WorkoutLog.calories_burned), 0))
        .filter(
            WorkoutLog.user_id == user.id,
            WorkoutLog.logged_at >= today_start,
            WorkoutLog.logged_at <= today_end,
        )
        .scalar()
    )

    base_target = profile.calculated_calorie_target
    adjusted_target = base_target + exercise_burn
    remaining_cals = adjusted_target - consumed_cals

    # Activity-Specific Sports Nutrition Macro Recovery Allocation Engine
    today_workouts = (
        db.query(WorkoutLog)
        .filter(
            WorkoutLog.user_id == user.id,
            WorkoutLog.logged_at >= today_start,
            WorkoutLog.logged_at <= today_end,
        )
        .all()
    )

    macro_additions = calculate_workout_macro_additions(today_workouts)
    cardio_burn = macro_additions["cardio_burn"]
    strength_burn = macro_additions["strength_burn"]
    general_burn = macro_additions["general_burn"]

    focus_key = (profile.fitness_focus or "athletic").lower()
    focus_cfg = FITNESS_FOCUS_CONFIG.get(focus_key, FITNESS_FOCUS_CONFIG["athletic"])
    max_protein_cap_g = profile.weight_kg * focus_cfg["max_protein_per_kg"]

    raw_adj_protein = profile.calculated_protein_target_g + macro_additions["extra_protein_g"]
    adj_target_protein = round(min(raw_adj_protein, max_protein_cap_g), 1)
    adj_target_carb = round(profile.calculated_carb_target_g + macro_additions["extra_carbs_g"], 1)
    adj_target_fat = round(profile.calculated_fat_target_g + macro_additions["extra_fat_g"], 1)

    # Dynamic Clinical Micronutrient Target Calculation Engine (NIH/WHO Guidelines)
    # 1. Base Profile & Gender-Scaled RDAs
    cal_target = profile.calculated_calorie_target
    is_female = profile.gender.lower() in ["female", "f"]

    base_fiber = (cal_target / 1000.0) * 14.0  # 14g per 1000 kcal (NIH Standard)
    base_sodium = 2300.0  # mg (Upper limit target)
    base_potassium = max(profile.weight_kg * 40.0, 3400.0)  # mg (Scaled to body weight)
    base_vitamin_c = 75.0 if is_female else 90.0  # mg (Gender RDA)
    base_calcium = 1000.0  # mg
    base_iron = 18.0 if is_female else 8.0  # mg (Gender RDA)

    # 2. Sweat Loss & Exercise Electrolyte/Antioxidant Recovery Credit Engine
    # Cardio & intense workout sweat causes sodium/potassium electrolyte loss; exercise increases oxidative stress (Vitamin C demand)
    extra_sodium_mg = (cardio_burn * 0.8) + (strength_burn * 0.4) + (general_burn * 0.5)
    extra_potassium_mg = (cardio_burn * 0.3) + (strength_burn * 0.15) + (general_burn * 0.2)
    extra_vitamin_c_mg = (exercise_burn / 500.0) * 25.0

    adj_target_fiber = round(base_fiber, 1)
    adj_target_sodium = round(base_sodium + extra_sodium_mg, 1)
    adj_target_potassium = round(base_potassium + extra_potassium_mg, 1)
    adj_target_vitamin_c = round(base_vitamin_c + extra_vitamin_c_mg, 1)
    adj_target_calcium = round(base_calcium, 1)
    adj_target_iron = round(base_iron, 1)

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
        target_fiber_g=adj_target_fiber,
        consumed_fiber_g=round(consumed_fiber, 1),
        target_sodium_mg=adj_target_sodium,
        consumed_sodium_mg=round(consumed_sodium, 1),
        target_potassium_mg=adj_target_potassium,
        consumed_potassium_mg=round(consumed_potassium, 1),
        target_vitamin_c_mg=adj_target_vitamin_c,
        consumed_vitamin_c_mg=round(consumed_vitamin_c, 1),
        target_calcium_mg=adj_target_calcium,
        consumed_calcium_mg=round(consumed_calcium, 1),
        target_iron_mg=adj_target_iron,
        consumed_iron_mg=round(consumed_iron, 1),
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
    meal.fiber_g = meal_in.fiber_g
    meal.sodium_mg = meal_in.sodium_mg
    meal.potassium_mg = meal_in.potassium_mg
    meal.vitamin_c_mg = meal_in.vitamin_c_mg
    meal.calcium_mg = meal_in.calcium_mg
    meal.iron_mg = meal_in.iron_mg
    if meal_in.quantity_g is not None:
        meal.quantity_g = meal_in.quantity_g

    db.commit()
    db.refresh(meal)
    return meal
