"""Deterministic physical equations module for BMR, TDEE, dynamic caloric pace, and macro targets."""

import math
from datetime import date
from typing import Any, Dict
from app.core.constants import (
    ACTIVITY_MULTIPLIERS,
    BMR_AGE_COEFF,
    BMR_FEMALE_OFFSET,
    BMR_HEIGHT_COEFF,
    BMR_MALE_OFFSET,
    BMR_WEIGHT_COEFF,
    KCAL_PER_G_CARBS,
    KCAL_PER_G_FAT,
    KCAL_PER_G_PROTEIN,
    KCAL_PER_KG_BODY_MASS,
    MACRO_RATIOS,
    MAX_SAFE_WEEKLY_LOSS_PCT,
    MINIMUM_SAFE_DAILY_CALORIES,
)


def calculate_age(birth_date: date) -> int:
    """Calculates current age in completed years from birth date.

    Args:
        birth_date: User's birth date instance.

    Returns:
        Age in years.
    """
    today = date.today()
    return today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))


def calculate_bmr(weight_kg: float, height_cm: float, birth_date: date, sex: str) -> float:
    """Calculates Basal Metabolic Rate (BMR) using the Mifflin-St Jeor equation.

    Args:
        weight_kg: User weight in kilograms.
        height_cm: User height in centimeters.
        birth_date: User's birth date.
        sex: Biological sex ('male' or 'female').

    Returns:
        Calculated BMR in kilocalories per day.
    """
    age = calculate_age(birth_date)
    base_bmr = (BMR_WEIGHT_COEFF * weight_kg) + (BMR_HEIGHT_COEFF * height_cm) - (BMR_AGE_COEFF * age)

    if sex.lower() == "male":
        return base_bmr + BMR_MALE_OFFSET
    else:
        return base_bmr + BMR_FEMALE_OFFSET


def calculate_tdee(bmr: float, activity_level: str) -> float:
    """Calculates Total Daily Energy Expenditure (TDEE) based on activity multiplier.

    Args:
        bmr: Basal Metabolic Rate in kilocalories.
        activity_level: Activity multiplier descriptor (sedentary, lightly_active, etc.).

    Returns:
        Total Daily Energy Expenditure in kilocalories.
    """
    multiplier = ACTIVITY_MULTIPLIERS.get(activity_level.lower(), ACTIVITY_MULTIPLIERS["sedentary"])
    return bmr * multiplier


def calculate_profile_targets(
    weight_kg: float,
    height_cm: float,
    birth_date: date,
    sex: str,
    activity_level: str,
    target_weight_kg: float,
    timeline_weeks: int,
) -> Dict[str, Any]:
    """Single-pass engine calculating BMR, TDEE, dynamic caloric pace, daily budget, and macro splits.

    Args:
        weight_kg: Current body weight in kilograms.
        height_cm: Height in centimeters.
        birth_date: User birth date.
        sex: Biological sex ('male' or 'female').
        activity_level: Physical activity level multiplier key.
        target_weight_kg: User's goal weight in kilograms.
        timeline_weeks: Desired timeframe to achieve target weight.

    Returns:
        Dictionary containing pre-computed BMR, TDEE, caloric pace, daily targets, and health safety flags.
    """
    bmr = calculate_bmr(weight_kg, height_cm, birth_date, sex)
    tdee = calculate_tdee(bmr, activity_level)

    weight_diff = target_weight_kg - weight_kg
    timeline_days = max(timeline_weeks * 7, 1)

    # Compute daily caloric pace required (7,700 kcal per kg of body mass)
    total_kcal_delta = weight_diff * KCAL_PER_KG_BODY_MASS
    caloric_pace = total_kcal_delta / timeline_days

    # Determine goal type category
    if weight_diff < -0.1:
        goal_type = "lose_weight"
    elif weight_diff > 0.1:
        goal_type = "gain_muscle"
    else:
        goal_type = "maintain"
        caloric_pace = 0.0

    # Calculate raw calorie target and floor at minimum safe calories (1200 kcal)
    raw_target = tdee + caloric_pace
    calculated_calorie_target = max(int(round(raw_target)), MINIMUM_SAFE_DAILY_CALORIES)

    # Health Guardrail Check: Max safe weekly weight loss rate (1.0% body weight per week)
    is_safe_pace = True
    suggested_min_weeks = timeline_weeks

    if goal_type == "lose_weight":
        weekly_loss_kg = abs(weight_diff) / timeline_weeks
        max_safe_weekly_loss = weight_kg * MAX_SAFE_WEEKLY_LOSS_PCT
        if weekly_loss_kg > max_safe_weekly_loss:
            is_safe_pace = False
            suggested_min_weeks = math.ceil(abs(weight_diff) / max_safe_weekly_loss)

    # Macro Split Calculation (Carbs, Protein, Fat)
    carb_ratio, protein_ratio, fat_ratio = MACRO_RATIOS.get(goal_type, MACRO_RATIOS["maintain"])
    carbs_g = (calculated_calorie_target * carb_ratio) / KCAL_PER_G_CARBS
    protein_g = (calculated_calorie_target * protein_ratio) / KCAL_PER_G_PROTEIN
    fat_g = (calculated_calorie_target * fat_ratio) / KCAL_PER_G_FAT

    return {
        "bmr": round(bmr, 1),
        "tdee": round(tdee, 1),
        "goal_type": goal_type,
        "caloric_pace_kcal_per_day": round(caloric_pace, 1),
        "calculated_calorie_target": calculated_calorie_target,
        "calculated_protein_target_g": round(protein_g, 1),
        "calculated_carb_target_g": round(carbs_g, 1),
        "calculated_fat_target_g": round(fat_g, 1),
        "is_safe_pace": is_safe_pace,
        "suggested_min_weeks": suggested_min_weeks,
    }


def calculate_net_exercise_calories(
    met: float,
    weight_kg: float,
    duration_minutes: float,
    activity_level: str = "sedentary",
) -> int:
    """Calculates net calories burned from an exercise workout using Solution A (Net MET).

    Net MET = max(Exercise MET - Baseline Activity Multiplier, 0.0)

    Args:
        met: Scientific MET (Metabolic Equivalent of Task) value of exercise.
        weight_kg: User body weight in kilograms.
        duration_minutes: Workout duration in minutes.
        activity_level: User baseline activity level descriptor.

    Returns:
        Net calories burned in kcal (integer rounded).
    """
    base_multiplier = ACTIVITY_MULTIPLIERS.get(activity_level.lower(), ACTIVITY_MULTIPLIERS["sedentary"])
    net_met = max(met - base_multiplier, 0.0)
    burn = net_met * weight_kg * (duration_minutes / 60.0)
    return int(round(burn))
