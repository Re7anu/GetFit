"""Application domain constants and physical health parameters."""

from typing import Dict, Tuple

# Scientific Energy Densities (kcal per gram)
KCAL_PER_G_CARBS: float = 4.0
KCAL_PER_G_PROTEIN: float = 4.0
KCAL_PER_G_FAT: float = 9.0

# Calorie Budget Adjustments & Safety Thresholds
MINIMUM_SAFE_DAILY_CALORIES: int = 1200
WEIGHT_LOSS_DEFICIT_KCAL: int = 500
MUSCLE_GAIN_SURPLUS_KCAL: int = 300

# Mifflin-St Jeor BMR Equation Coefficients
BMR_WEIGHT_COEFF: float = 10.0
BMR_HEIGHT_COEFF: float = 6.25
BMR_AGE_COEFF: float = 5.0
BMR_MALE_OFFSET: float = 5.0
BMR_FEMALE_OFFSET: float = -161.0

# Activity Level Multipliers (Mifflin-St Jeor)
ACTIVITY_MULTIPLIERS: Dict[str, float] = {
    "sedentary": 1.2,
    "lightly_active": 1.375,
    "moderately_active": 1.55,
    "very_active": 1.725,
    "extra_active": 1.9,
}

# Goal Macro Split Ratios: (Carbs %, Protein %, Fat %)
MACRO_RATIOS: Dict[str, Tuple[float, float, float]] = {
    "lose_weight": (0.40, 0.30, 0.30),
    "gain_muscle": (0.50, 0.25, 0.25),
    "maintain": (0.50, 0.20, 0.30),
}
