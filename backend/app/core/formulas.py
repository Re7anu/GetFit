"""Deterministic physical equations module for BMR, TDEE, and macro targets."""

from datetime import date
from typing import Tuple


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
    if sex.lower() == "male":
        return (10 * weight_kg) + (6.25 * height_cm) - (5 * age) + 5
    else:
        # Defaults to female calculation for any other entry for safety/consistency
        return (10 * weight_kg) + (6.25 * height_cm) - (5 * age) - 161


def calculate_tdee(bmr: float, activity_level: str) -> float:
    """Calculates Total Daily Energy Expenditure (TDEE) based on activity multiplier.

    Args:
        bmr: Basal Metabolic Rate in kilocalories.
        activity_level: Activity multiplier descriptor (sedentary, lightly_active, etc.).

    Returns:
        Total Daily Energy Expenditure in kilocalories.
    """
    multipliers = {
        "sedentary": 1.2,
        "lightly_active": 1.375,
        "moderately_active": 1.55,
        "very_active": 1.725,
        "extra_active": 1.9,
    }
    return bmr * multipliers.get(activity_level.lower(), 1.2)


def calculate_targets(
    weight_kg: float,
    height_cm: float,
    birth_date: date,
    sex: str,
    activity_level: str,
    goal_type: str,
) -> Tuple[int, float, float, float]:
    """Computes daily calorie budget and macronutrient breakdown in grams.

    Args:
        weight_kg: Current body weight in kilograms.
        height_cm: Height in centimeters.
        birth_date: User birth date.
        sex: Biological sex ('male' or 'female').
        activity_level: Physical activity level multiplier key.
        goal_type: Primary goal ('lose_weight', 'maintain', or 'gain_muscle').

    Returns:
        Tuple containing (calorie_target, carbs_g, protein_g, fat_g).
    """
    bmr = calculate_bmr(weight_kg, height_cm, birth_date, sex)
    tdee = calculate_tdee(bmr, activity_level)

    # Calorie Adjustment based on goal
    if goal_type.lower() == "lose_weight":
        calorie_target = max(int(tdee - 500), 1200)  # Floor calorie budget to 1200 kcal for safety
        # Macro Split: 40% Carbs, 30% Protein, 30% Fat
        carbs_g = (calorie_target * 0.40) / 4
        protein_g = (calorie_target * 0.30) / 4
        fat_g = (calorie_target * 0.30) / 9
    elif goal_type.lower() == "gain_muscle":
        calorie_target = int(tdee + 300)
        # Macro Split: 50% Carbs, 25% Protein, 25% Fat
        carbs_g = (calorie_target * 0.50) / 4
        protein_g = (calorie_target * 0.25) / 4
        fat_g = (calorie_target * 0.25) / 9
    else:  # maintain
        calorie_target = int(tdee)
        # Macro Split: 50% Carbs, 20% Protein, 30% Fat
        carbs_g = (calorie_target * 0.50) / 4
        protein_g = (calorie_target * 0.20) / 4
        fat_g = (calorie_target * 0.30) / 9

    return calorie_target, round(carbs_g, 1), round(protein_g, 1), round(fat_g, 1)

