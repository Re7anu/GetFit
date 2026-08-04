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
You are an expert clinical nutritionist AI with multimodal computer vision capabilities. Analyze the attached image thoroughly:
1. Determine if the image contains edible food or beverages. If the image is a non-food object (e.g., car, animal, vehicle, document, clothing, furniture, landscape), set "is_food_item": false.
2. If it is food, identify all distinct food items, ingredients, portion sizes, and preparation methods.
3. Incorporate user context notes:
Optional User Meal Hint: "{meal_hint}"
Supporting User Notes / Context: "{user_notes}"
4. Calculate macros (protein, carbs, fat) and essential micronutrients (fiber, sodium, potassium, vitamin C, calcium, iron) based on standard USDA nutritional databases.

Return ONLY a valid raw JSON object strictly matching this JSON structure:
{{
  "is_food_item": true,
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


DAILY_REPORT_INSIGHTS_PROMPT_TEMPLATE: str = """
You are GetFit AI, an elite clinical nutritionist and sports physiologist.
Analyze the following daily user health summary and provide exactly 3 concise, holistic, encouraging, and actionable bullet-point insights for their nightly email report.

Daily Summary Data:
- Goal Type: {goal_type}
- Target Calories: {base_calorie_target} kcal | Consumed: {consumed_calories} kcal
- Workouts Logged Today: {workout_summary_str} (Total Net Burn: {exercise_net_calories_burned} kcal)
- Adjusted Target Calories: {adjusted_calorie_target} kcal
- Protein: {consumed_protein_g}g / {target_protein_g}g
- Carbs: {consumed_carb_g}g / {target_carb_g}g
- Fat: {consumed_fat_g}g / {target_fat_g}g
- Micronutrients Logged: {micros_str}
- Goal Hit Status: {goal_hit_status}

Instructions:
Provide exactly 3 concise bullet points. Seamlessly incorporate nutrition, workouts logged, and micronutrients into the 3 bullet points. Do NOT create separate subheadings for workouts or micronutrients. Keep each insight under 25 words.
Return JSON matching response_schema with key "insights".
"""

