from datetime import date
from typing import Dict, Tuple

def calculate_age(birth_date: date) -> int:
    today = date.today()
    return today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))

def calculate_bmr(weight_kg: float, height_cm: float, birth_date: date, sex: str) -> float:
    age = calculate_age(birth_date)
    if sex.lower() == "male":
        return (10 * weight_kg) + (6.25 * height_cm) - (5 * age) + 5
    else:
        # Defaults to female calculation for any other entry for safety/consistency
        return (10 * weight_kg) + (6.25 * height_cm) - (5 * age) - 161

def calculate_tdee(bmr: float, activity_level: str) -> float:
    multipliers = {
        "sedentary": 1.2,
        "lightly_active": 1.375,
        "moderately_active": 1.55,
        "very_active": 1.725,
        "extra_active": 1.9
    }
    return bmr * multipliers.get(activity_level.lower(), 1.2)

def calculate_targets(
    weight_kg: float,
    height_cm: float,
    birth_date: date,
    sex: str,
    activity_level: str,
    goal_type: str
) -> Tuple[int, float, float, float]:
    """
    Computes calorie target and macros (carbs, protein, fat in grams)
    Returns: (calorie_target, carbs_g, protein_g, fat_g)
    """
    bmr = calculate_bmr(weight_kg, height_cm, birth_date, sex)
    tdee = calculate_tdee(bmr, activity_level)

    # Calorie Adjustment based on goal
    if goal_type.lower() == "lose_weight":
        calorie_target = max(int(tdee - 500), 1200) # Floor calorie budget to 1200 kcal for general physical safety
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
    else: # maintain
        calorie_target = int(tdee)
        # Macro Split: 50% Carbs, 20% Protein, 30% Fat
        carbs_g = (calorie_target * 0.50) / 4
        protein_g = (calorie_target * 0.20) / 4
        fat_g = (calorie_target * 0.30) / 9

    return calorie_target, round(carbs_g, 1), round(protein_g, 1), round(fat_g, 1)
