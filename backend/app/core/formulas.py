"""Deterministic physical equations module for BMR, TDEE, and macro targets."""

from datetime import date
from typing import Tuple
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
    MACRO_RATIOS,
    MINIMUM_SAFE_DAILY_CALORIES,
    MUSCLE_GAIN_SURPLUS_KCAL,
    WEIGHT_LOSS_DEFICIT_KCAL,
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
        # Defaults to female offset for any other entry for safety/consistency
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


class BaseTargetCalculator:
    """Base class for computing daily calorie targets and macronutrient splits."""

    def __init__(
        self,
        weight_kg: float,
        height_cm: float,
        birth_date: date,
        sex: str,
        activity_level: str,
    ):
        """Initializes target calculator with user physical metrics.

        Args:
            weight_kg: Current body weight in kilograms.
            height_cm: Height in centimeters.
            birth_date: User birth date.
            sex: Biological sex ('male' or 'female').
            activity_level: Physical activity level multiplier key.
        """
        self.weight_kg = weight_kg
        self.height_cm = height_cm
        self.birth_date = birth_date
        self.sex = sex
        self.activity_level = activity_level
        self.bmr = calculate_bmr(weight_kg, height_cm, birth_date, sex)
        self.tdee = calculate_tdee(self.bmr, activity_level)

    def calculate(self) -> Tuple[int, float, float, float]:
        """Calculates calorie target and macronutrients (carbs_g, protein_g, fat_g).

        Raises:
            NotImplementedError: Must be implemented by goal-specific subclasses.
        """
        raise NotImplementedError("Subclasses must implement calculate().")


class WeightLossTargetCalculator(BaseTargetCalculator):
    """Subclass calculator for weight loss goals."""

    def calculate(self) -> Tuple[int, float, float, float]:
        """Computes calorie target and macros for weight loss.

        Returns:
            Tuple containing (calorie_target, carbs_g, protein_g, fat_g).
        """
        calorie_target = max(int(self.tdee - WEIGHT_LOSS_DEFICIT_KCAL), MINIMUM_SAFE_DAILY_CALORIES)
        carb_ratio, protein_ratio, fat_ratio = MACRO_RATIOS["lose_weight"]
        carbs_g = (calorie_target * carb_ratio) / KCAL_PER_G_CARBS
        protein_g = (calorie_target * protein_ratio) / KCAL_PER_G_PROTEIN
        fat_g = (calorie_target * fat_ratio) / KCAL_PER_G_FAT
        return calorie_target, round(carbs_g, 1), round(protein_g, 1), round(fat_g, 1)


class GainMuscleTargetCalculator(BaseTargetCalculator):
    """Subclass calculator for muscle gain goals."""

    def calculate(self) -> Tuple[int, float, float, float]:
        """Computes calorie target and macros for muscle gain.

        Returns:
            Tuple containing (calorie_target, carbs_g, protein_g, fat_g).
        """
        calorie_target = int(self.tdee + MUSCLE_GAIN_SURPLUS_KCAL)
        carb_ratio, protein_ratio, fat_ratio = MACRO_RATIOS["gain_muscle"]
        carbs_g = (calorie_target * carb_ratio) / KCAL_PER_G_CARBS
        protein_g = (calorie_target * protein_ratio) / KCAL_PER_G_PROTEIN
        fat_g = (calorie_target * fat_ratio) / KCAL_PER_G_FAT
        return calorie_target, round(carbs_g, 1), round(protein_g, 1), round(fat_g, 1)


class MaintenanceTargetCalculator(BaseTargetCalculator):
    """Subclass calculator for weight maintenance goals."""

    def calculate(self) -> Tuple[int, float, float, float]:
        """Computes calorie target and macros for weight maintenance.

        Returns:
            Tuple containing (calorie_target, carbs_g, protein_g, fat_g).
        """
        calorie_target = int(self.tdee)
        carb_ratio, protein_ratio, fat_ratio = MACRO_RATIOS["maintain"]
        carbs_g = (calorie_target * carb_ratio) / KCAL_PER_G_CARBS
        protein_g = (calorie_target * protein_ratio) / KCAL_PER_G_PROTEIN
        fat_g = (calorie_target * fat_ratio) / KCAL_PER_G_FAT
        return calorie_target, round(carbs_g, 1), round(protein_g, 1), round(fat_g, 1)


def calculate_targets(
    weight_kg: float,
    height_cm: float,
    birth_date: date,
    sex: str,
    activity_level: str,
    goal_type: str,
) -> Tuple[int, float, float, float]:
    """Computes daily calorie budget and macronutrient breakdown in grams using goal-specific calculators.

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
    goal = goal_type.lower() if goal_type else "maintain"
    calculators = {
        "lose_weight": WeightLossTargetCalculator,
        "gain_muscle": GainMuscleTargetCalculator,
        "maintain": MaintenanceTargetCalculator,
    }
    calculator_cls = calculators.get(goal, MaintenanceTargetCalculator)
    calculator = calculator_cls(weight_kg, height_cm, birth_date, sex, activity_level)
    return calculator.calculate()
