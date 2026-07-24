"""Google Gemini AI Service module for natural language food & exercise parsing."""

import json
import re
from typing import Any, Dict
import httpx
from fastapi import HTTPException, status
from app.config.settings import settings
from app.core.prompts import EXERCISE_PARSING_PROMPT_TEMPLATE, FOOD_PARSING_PROMPT_TEMPLATE

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"


def _call_gemini_api(prompt: str) -> str:
    """Helper executing raw HTTP request to Google Gemini API.

    Args:
        prompt: Raw prompt text.

    Returns:
        Generated text response string from Gemini.

    Raises:
        HTTPException: If GEMINI_API_KEY is missing or API request fails.
    """
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GEMINI_API_KEY is not configured on the server.",
        )

    url = f"{GEMINI_API_URL}?key={settings.GEMINI_API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}]
    }

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(url, json=payload)
            if response.status_code != 200:
                # Fallback to gemini-1.5-flash if 2.5 is unavailable
                fallback_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
                response = client.post(fallback_url, json=payload)

            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Gemini API request failed: {response.text}",
                )

            data = response.json()
            raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
            return raw_text
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error communicating with Gemini AI service: {str(e)}",
        )


def _clean_json_response(raw_text: str) -> Dict[str, Any]:
    """Strips markdown code blocks and parses raw text into a Python dictionary."""
    cleaned = raw_text.strip()
    # Remove markdown ```json ... ``` blocks
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        return json.loads(cleaned)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to parse structured JSON from Gemini response: {cleaned}",
        )


def parse_food_description(text_prompt: str) -> Dict[str, Any]:
    """Uses Gemini AI to parse a freeform food description into structured nutrition data.

    Args:
        text_prompt: Freeform food description string (e.g. "2 eggs and toast").

    Returns:
        Dictionary containing meal_type, description, calories, protein_g, carbs_g, fat_g, quantity_g.
    """
    prompt = FOOD_PARSING_PROMPT_TEMPLATE.format(text_prompt=text_prompt)
    raw_response = _call_gemini_api(prompt)
    return _clean_json_response(raw_response)


def parse_exercise_description(text_prompt: str) -> Dict[str, Any]:
    """Uses Gemini AI to parse a freeform workout description into exercise parameters and MET value.

    Args:
        text_prompt: Freeform workout description string (e.g. "30 mins heavy squats").

    Returns:
        Dictionary containing exercise_name, duration_minutes, met_value, notes.
    """
    prompt = EXERCISE_PARSING_PROMPT_TEMPLATE.format(text_prompt=text_prompt)
    raw_response = _call_gemini_api(prompt)
    return _clean_json_response(raw_response)
