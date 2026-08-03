"""Centralized AI prompt templates module for LLM integrations (Gemini AI)."""

FOOD_PARSING_PROMPT_TEMPLATE: str = """
You are an expert clinical nutritionist AI. Analyze the following food description text and estimate its macronutrient and micronutrient profile based on standard USDA nutritional values.
User Input: "{text_prompt}"

Return ONLY a valid raw JSON object strictly matching this JSON structure:
{{
  "meal_type": "breakfast",
  "description": "Scrambled eggs on whole wheat toast",
  "calories": 350,
  "protein_g": 20.0,
  "carbs_g": 25.0,
  "fat_g": 18.0,
  "fiber_g": 3.0,
  "sodium_mg": 420.0,
  "potassium_mg": 310.0,
  "vitamin_c_mg": 0.0,
  "calcium_mg": 85.0,
  "iron_mg": 2.1,
  "quantity_g": 220.0
}}
"""

MICRONUTRIENT_ENRICHMENT_PROMPT: str = """
You are an expert clinical nutritionist AI. Given the food description "{description}" with user-entered macros ({calories} kcal, {protein_g}g protein, {carbs_g}g carbs, {fat_g}g fat), estimate its 6 essential micronutrient values based on standard USDA food profiles.

Return ONLY a valid raw JSON object strictly matching this JSON structure:
{{
  "meal_type": "{meal_type}",
  "description": "{description}",
  "calories": {calories},
  "protein_g": {protein_g},
  "carbs_g": {carbs_g},
  "fat_g": {fat_g},
  "fiber_g": 3.5,
  "sodium_mg": 250.0,
  "potassium_mg": 300.0,
  "vitamin_c_mg": 12.0,
  "calcium_mg": 50.0,
  "iron_mg": 1.5
}}
"""

FOOD_IMAGE_PARSING_PROMPT: str = """
You are an expert clinical nutritionist AI with multimodal computer vision capabilities. Analyze the attached food image thoroughly:
1. Identify all distinct food items, ingredients, portion sizes, and preparation methods.
2. Incorporate user context notes:
Optional User Meal Hint: "{meal_hint}"
Supporting User Notes / Context: "{user_notes}"
3. Calculate macros (protein, carbs, fat) and essential micronutrients (fiber, sodium, potassium, vitamin C, calcium, iron) based on standard USDA nutritional databases.

Return ONLY a valid raw JSON object strictly matching this JSON structure:
{{
  "meal_type": "lunch",
  "description": "Grilled Salmon with Quinoa and Roasted Asparagus",
  "calories": 520,
  "protein_g": 42.0,
  "carbs_g": 35.0,
  "fat_g": 22.0,
  "fiber_g": 6.0,
  "sodium_mg": 480.0,
  "potassium_mg": 720.0,
  "vitamin_c_mg": 18.0,
  "calcium_mg": 60.0,
  "iron_mg": 3.2,
  "quantity_g": 380.0
}}
"""

