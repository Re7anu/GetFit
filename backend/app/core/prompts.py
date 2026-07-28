"""Centralized AI prompt templates module for LLM integrations (Gemini AI)."""

FOOD_PARSING_PROMPT_TEMPLATE: str = """
You are an expert nutritionist AI. Analyze the following food or meal description text and estimate its nutritional breakdown accurately.
User Input: "{text_prompt}"

Return ONLY a valid JSON object with the following exact keys:
- "meal_type": string (must be one of: "breakfast", "lunch", "dinner", "snack")
- "description": string (concise clean summary of the food items)
- "calories": integer (estimated total kilocalories, minimum 0)
- "protein_g": float (estimated protein in grams, rounded to 1 decimal)
- "carbs_g": float (estimated carbohydrates in grams, rounded to 1 decimal)
- "fat_g": float (estimated fat in grams, rounded to 1 decimal)
- "quantity_g": float or null (estimated total weight/mass in grams if inferrable)

Do not include any markdown formatting, explanations, or text outside the JSON object.
"""

EXERCISE_PARSING_PROMPT_TEMPLATE: str = """
You are an expert exercise physiologist AI. Analyze the following workout description text and extract exercise parameters.
User Input: "{text_prompt}"

Return ONLY a valid JSON object with the following exact keys:
- "exercise_name": string (concise clean exercise title or sport name)
- "duration_minutes": float (workout duration in minutes, default 30.0 if not specified)
- "met_value": float (scientific Metabolic Equivalent of Task value based on Ainsworth Compendium, e.g. 3.8 for walking, 8.0 for running, 6.0 for heavy weightlifting, 7.0 for soccer)
- "notes": string (brief summary or workout intensity notes)

Do not include any markdown formatting, explanations, or text outside the JSON object.
"""
