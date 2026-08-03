"""Application domain constants, physical health parameters, and safety thresholds."""

from typing import Dict, Tuple

# Scientific Energy Densities (kcal per gram)
KCAL_PER_G_CARBS: float = 4.0
KCAL_PER_G_PROTEIN: float = 4.0
KCAL_PER_G_FAT: float = 9.0

# Energy equivalent of 1 kg of human body mass (kcal)
KCAL_PER_KG_BODY_MASS: float = 7700.0

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

# Safety & Health Guardrails
MINIMUM_SAFE_DAILY_CALORIES: int = 1200
MAX_SAFE_WEEKLY_LOSS_PCT: float = 0.01  # Max 1.0% of body weight loss per week

# Fitness Philosophy & Macro Focus Configurations (Base Protein g/kg, Max Protein Cap g/kg)
FITNESS_FOCUS_CONFIG: Dict[str, Dict[str, float]] = {
    "bodybuilding": {
        "base_protein_per_kg": 1.8,
        "max_protein_per_kg": 2.5,
        "fat_pct": 0.25,
    },
    "athletic": {
        "base_protein_per_kg": 1.6,
        "max_protein_per_kg": 2.2,
        "fat_pct": 0.25,
    },
    "sports_endurance": {
        "base_protein_per_kg": 1.4,
        "max_protein_per_kg": 2.0,
        "fat_pct": 0.25,
    },
    "general_health": {
        "base_protein_per_kg": 1.2,
        "max_protein_per_kg": 1.8,
        "fat_pct": 0.25,
    },
}

# Default 7-Day Routine Blueprint
DEFAULT_WEEKLY_SCHEDULE = [
    {"day": "monday", "activity_type": "gym", "targets": ["chest", "triceps"], "is_completed": False},
    {"day": "tuesday", "activity_type": "gym", "targets": ["back", "biceps"], "is_completed": False},
    {"day": "wednesday", "activity_type": "sports", "targets": ["football"], "is_completed": False},
    {"day": "thursday", "activity_type": "gym", "targets": ["quads", "hamstrings", "glutes"], "is_completed": False},
    {"day": "friday", "activity_type": "gym", "targets": ["shoulders", "abs"], "is_completed": False},
    {"day": "saturday", "activity_type": "cardio", "targets": ["walking"], "is_completed": False},
    {"day": "sunday", "activity_type": "rest", "targets": [], "is_completed": False},
]

# Exercise Physiology Category Matching Keyword Tuples
CARDIO_EXERCISE_KEYWORDS = (
    "run", "cycle", "swim", "row", "walk", "hiit", "soccer", "football",
    "basketball", "tennis", "padel", "badminton", "sports", "aerobic",
)

STRENGTH_EXERCISE_KEYWORDS = (
    "push", "pull", "squat", "bench", "lift", "press", "curl", "lunge",
    "dip", "crunch", "burpee", "gym", "weight", "shrug", "extension", "raise",
)

# Workout Physiology Recovery Macro Additions Ratios: (Protein %, Carbs %, Fat %)
WORKOUT_RECOVERY_MACRO_SPLITS: Dict[str, Tuple[float, float, float]] = {
    "cardio": (0.15, 0.75, 0.10),    # Glycogen replenishment focus (75% Carbs, 15% Protein, 10% Fat)
    "strength": (0.45, 0.45, 0.10),  # Muscle protein synthesis focus (45% Protein, 45% Carbs, 10% Fat)
    "general": (0.20, 0.50, 0.30),   # Balanced baseline recovery (20% Protein, 50% Carbs, 30% Fat)
}

