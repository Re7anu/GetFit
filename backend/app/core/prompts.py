"""Centralized AI prompt templates module for LLM integrations (Gemini AI)."""

FOOD_PARSING_PROMPT_TEMPLATE: str = """
You are an expert clinical nutritionist AI. Analyze the following food or meal description text and estimate both its macronutrient and micronutrient profile accurately based on standard USDA nutritional values.
User Input: "{text_prompt}"

Return ONLY a valid JSON object matching the schema:
- "meal_type": string (must be one of: "breakfast", "lunch", "dinner", "snack")
- "description": string (concise clean summary of the food items)
- "calories": integer (estimated total kilocalories, minimum 0)
- "protein_g": float (estimated protein in grams, rounded to 1 decimal)
- "carbs_g": float (estimated carbohydrates in grams, rounded to 1 decimal)
- "fat_g": float (estimated fat in grams, rounded to 1 decimal)
- "fiber_g": float (estimated dietary fiber in grams, rounded to 1 decimal)
- "sodium_mg": float (estimated sodium in milligrams, rounded to 1 decimal)
- "potassium_mg": float (estimated potassium in milligrams, rounded to 1 decimal)
- "vitamin_c_mg": float (estimated vitamin C in milligrams, rounded to 1 decimal)
- "calcium_mg": float (estimated calcium in milligrams, rounded to 1 decimal)
- "iron_mg": float (estimated iron in milligrams, rounded to 1 decimal)
- "quantity_g": float or null (estimated total weight/mass in grams if inferrable)

Do not include any markdown formatting, explanations, or text outside the JSON object.
"""

MICRONUTRIENT_ENRICHMENT_PROMPT: str = """
You are an expert clinical nutritionist AI. Given the food description "{description}" with user-entered macros ({calories} kcal, {protein_g}g protein, {carbs_g}g carbs, {fat_g}g fat), estimate its 6 essential micronutrient values accurately based on standard USDA food database profiles.

Return ONLY a valid JSON object matching the schema:
- "meal_type": string ("{meal_type}")
- "description": string ("{description}")
- "calories": integer ({calories})
- "protein_g": float ({protein_g})
- "carbs_g": float ({carbs_g})
- "fat_g": float ({fat_g})
- "fiber_g": float (estimated dietary fiber in grams, rounded to 1 decimal)
- "sodium_mg": float (estimated sodium in milligrams, rounded to 1 decimal)
- "potassium_mg": float (estimated potassium in milligrams, rounded to 1 decimal)
- "vitamin_c_mg": float (estimated vitamin C in milligrams, rounded to 1 decimal)
- "calcium_mg": float (estimated calcium in milligrams, rounded to 1 decimal)
- "iron_mg": float (estimated iron in milligrams, rounded to 1 decimal)
"""

FOOD_IMAGE_PARSING_PROMPT: str = """
You are an expert clinical nutritionist AI with advanced multimodal computer vision capabilities. Analyze the attached food image thoroughly and perform the following analysis:
1. Identify all distinct food items, ingredients, portion sizes, and preparation methods visible in the image.
2. Incorporate any supporting context, ingredients, or notes provided by the user to refine accuracy (e.g., cooking oils, hidden condiments, specific brands, or portion weight details).
3. Estimate the total weight in grams and energy density (kcal).
4. Accurately calculate the macronutrients (protein, carbs, fat) and essential micronutrients (fiber, sodium, potassium, vitamin C, calcium, iron) based on standard USDA nutritional databases.

Optional User Meal Hint: "{meal_hint}"
Supporting User Notes / Context: "{user_notes}"

Return ONLY a valid JSON object matching the schema:
- "meal_type": string (must be one of: "breakfast", "lunch", "dinner", "snack")
- "description": string (clear, detailed summary of identified food items e.g., "Grilled Salmon with Quinoa and Roasted Asparagus")
- "calories": integer (estimated total kilocalories, minimum 0)
- "protein_g": float (estimated protein in grams, rounded to 1 decimal)
- "carbs_g": float (estimated carbohydrates in grams, rounded to 1 decimal)
- "fat_g": float (estimated fat in grams, rounded to 1 decimal)
- "fiber_g": float (estimated dietary fiber in grams, rounded to 1 decimal)
- "sodium_mg": float (estimated sodium in milligrams, rounded to 1 decimal)
- "potassium_mg": float (estimated potassium in milligrams, rounded to 1 decimal)
- "vitamin_c_mg": float (estimated vitamin C in milligrams, rounded to 1 decimal)
- "calcium_mg": float (estimated calcium in milligrams, rounded to 1 decimal)
- "iron_mg": float (estimated iron in milligrams, rounded to 1 decimal)
- "quantity_g": float or null (estimated total weight/mass in grams if inferrable)

Do not include any markdown formatting, explanations, or text outside the JSON object.
"""

