"""Google Gemini AI Service module for low-level Gemini API communication."""

import json
import re
from typing import Any, Dict
import httpx
from fastapi import HTTPException, status
from app.config.settings import settings

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"


def generate_content(prompt: str) -> str:
    """Executes a raw content generation HTTP request to Google Gemini API.

    Args:
        prompt: Prompt string.

    Returns:
        Generated text response.
    """
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GEMINI_API_KEY is not configured on the server.",
        )

    url = f"{GEMINI_API_URL}?key={settings.GEMINI_API_KEY}"
    payload = {"contents": [{"parts": [{"text": prompt}]}]}

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(url, json=payload)
            if response.status_code != 200:
                fallback_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
                response = client.post(fallback_url, json=payload)

            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Gemini API request failed: {response.text}",
                )

            data = response.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error communicating with Gemini AI service: {str(e)}",
        )


def generate_json(prompt: str) -> Dict[str, Any]:
    """Generates structured JSON from Gemini API, stripping markdown code fences.

    Args:
        prompt: Structured JSON prompt text.

    Returns:
        Parsed dictionary.
    """
    raw_text = generate_content(prompt)
    cleaned = raw_text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        return json.loads(cleaned)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to parse structured JSON from Gemini response: {cleaned}",
        )
