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
    CARDIO_EXERCISE_KEYWORDS,
    FITNESS_FOCUS_CONFIG,
    KCAL_PER_G_CARBS,
    KCAL_PER_G_FAT,
    KCAL_PER_G_PROTEIN,
    KCAL_PER_KG_BODY_MASS,
    MACRO_RATIOS,
    MAX_SAFE_WEEKLY_LOSS_PCT,
    MINIMUM_SAFE_DAILY_CALORIES,
    STRENGTH_EXERCISE_KEYWORDS,
    WORKOUT_RECOVERY_MACRO_SPLITS,
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


def calculate_bmr(weight_kg: float, height_cm: float, birth_date: date, gender: str) -> float:
    """Calculates Basal Metabolic Rate (BMR) using the Mifflin-St Jeor equation.

    Args:
        weight_kg: User weight in kilograms.
        height_cm: User height in centimeters.
        birth_date: User's birth date.
        gender: Biological gender ('male' or 'female').

    Returns:
        Calculated BMR in kilocalories per day.
    """
    age = calculate_age(birth_date)
    base_bmr = (BMR_WEIGHT_COEFF * weight_kg) + (BMR_HEIGHT_COEFF * height_cm) - (BMR_AGE_COEFF * age)

    if gender.lower() == "male":
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


def calculate_target_budgets(
    weight_kg: float,
    height_cm: float,
    birth_date: date,
    gender: str,
    target_weight_kg: float,
    timeline_weeks: int,
    activity_level: str,
    fitness_focus: str = "athletic",
) -> Dict[str, Any]:
    """Calculates evidence-based daily caloric target and macronutrient splits with safety guardrails.

    Args:
        weight_kg: Current body weight in kg.
        height_cm: Height in cm.
        birth_date: Birth date object.
        gender: Biological sex ('male' or 'female').
        target_weight_kg: Target weight goal in kg.
        timeline_weeks: Goal timeframe in weeks.
        activity_level: Baseline activity level descriptor.
        fitness_focus: Fitness philosophy ('bodybuilding', 'athletic', 'sports_endurance').

    Returns:
        Dict containing BMR, TDEE, Caloric Pace, targets, and safety flags.
    """
    bmr = calculate_bmr(weight_kg, height_cm, birth_date, gender)
    tdee = calculate_tdee(bmr, activity_level)

    weight_diff = target_weight_kg - weight_kg

    # Determine Goal Strategy
    if weight_diff > 0.1:
        goal_type = "gain_muscle"
        total_deficit = weight_diff * KCAL_PER_KG_BODY_MASS
        caloric_pace = total_deficit / (timeline_weeks * 7.0)
    elif weight_diff < -0.1:
        goal_type = "lose_weight"
        total_deficit = weight_diff * KCAL_PER_KG_BODY_MASS
        caloric_pace = total_deficit / (timeline_weeks * 7.0)
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

    # Fitness Philosophy & Macro Focus Allocation Engine
    focus_key = (fitness_focus or "athletic").lower()
    focus_cfg = FITNESS_FOCUS_CONFIG.get(focus_key, FITNESS_FOCUS_CONFIG["athletic"])
    
    # Goal Strategy & Pace-Based Protein Allocation Engine
    weekly_rate_kg = abs(weight_diff) / max(timeline_weeks, 1)
    goal_protein_modifier = 0.0

    if goal_type == "lose_weight":
        # Base deficit modifier
        goal_protein_modifier = 0.15
        # If aggressive pace (>= 0.5 kg/week loss), elevate protein to protect lean muscle mass from catabolism
        if weekly_rate_kg >= 0.5:
            goal_protein_modifier += 0.10
    elif goal_type == "gain_muscle":
        # Base surplus modifier
        goal_protein_modifier = 0.05
        # If active hypertrophy pace (>= 0.3 kg/week gain), elevate protein for tissue synthesis
        if weekly_rate_kg >= 0.3:
            goal_protein_modifier += 0.05

    protein_per_kg = focus_cfg["base_protein_per_kg"] + goal_protein_modifier
    max_protein_cap_g = weight_kg * focus_cfg["max_protein_per_kg"]
    fat_pct = focus_cfg["fat_pct"]

    # Calculate baseline protein grams based on body weight & fitness focus (capped at max_protein_cap_g)
    protein_g = min(weight_kg * protein_per_kg, max_protein_cap_g)
    protein_kcal = protein_g * KCAL_PER_G_PROTEIN

    # Calculate fat grams with dual guardrails:
    # 1. Standard 25% caloric split
    # 2. Weight-scaled hormone floor (0.6 g/kg)
    # 3. Absolute gallbladder safety floor (35.0g)
    raw_fat_g = (calculated_calorie_target * fat_pct) / KCAL_PER_G_FAT
    fat_g = max(raw_fat_g, weight_kg * 0.6, 35.0)
    fat_kcal = fat_g * KCAL_PER_G_FAT

    # Calculate remaining energy allocated to carbohydrates
    carb_kcal = max(calculated_calorie_target - (protein_kcal + fat_kcal), 0.0)
    carbs_g = carb_kcal / KCAL_PER_G_CARBS

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


# Backward compatibility alias
calculate_profile_targets = calculate_target_budgets


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


def calculate_workout_macro_additions(workouts: list) -> Dict[str, float]:
    """Calculates activity-specific recovery macro additions based on exercise physiology.
    
    Cardio & Endurance Sports (Football, Running): 75% Carbs (Glycogen refill), 15% Protein, 10% Fat
    Strength & Resistance Training (Gym): 45% Protein (Muscle Synthesis), 45% Carbs, 10% Fat
    """
    from app.core.exercise_catalog import EXERCISE_CATALOG

    cardio_burn = 0.0
    strength_burn = 0.0
    general_burn = 0.0

    for w in workouts:
        matched_cat = "general"
        name_lower = getattr(w, "exercise_name", "").lower()
        for cat_id, cat_info in EXERCISE_CATALOG.items():
            if cat_info["name"].lower() in name_lower or cat_id in name_lower:
                matched_cat = cat_info["category"]
                break
        
        cals_burned = getattr(w, "calories_burned", 0)
        if matched_cat == "distance" or matched_cat == "time" or any(k in name_lower for k in CARDIO_EXERCISE_KEYWORDS):
            cardio_burn += cals_burned
        elif matched_cat == "reps" or any(k in name_lower for k in STRENGTH_EXERCISE_KEYWORDS):
            strength_burn += cals_burned
        else:
            general_burn += cals_burned

    c_prot, c_carb, c_fat = WORKOUT_RECOVERY_MACRO_SPLITS["cardio"]
    s_prot, s_carb, s_fat = WORKOUT_RECOVERY_MACRO_SPLITS["strength"]
    g_prot, g_carb, g_fat = WORKOUT_RECOVERY_MACRO_SPLITS["general"]

    extra_protein_g = ((strength_burn * s_prot) + (cardio_burn * c_prot) + (general_burn * g_prot)) / KCAL_PER_G_PROTEIN
    extra_carbs_g = ((cardio_burn * c_carb) + (strength_burn * s_carb) + (general_burn * g_carb)) / KCAL_PER_G_CARBS
    extra_fat_g = ((cardio_burn * c_fat) + (strength_burn * s_fat) + (general_burn * g_fat)) / KCAL_PER_G_FAT

    return {
        "extra_protein_g": round(extra_protein_g, 1),
        "extra_carbs_g": round(extra_carbs_g, 1),
        "extra_fat_g": round(extra_fat_g, 1),
        "cardio_burn": cardio_burn,
        "strength_burn": strength_burn,
        "general_burn": general_burn,
    }

