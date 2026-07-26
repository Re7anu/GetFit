"""Google Gemini AI Service module using the official google-genai SDK."""

import json
import re
from typing import Any, Dict
from fastapi import HTTPException, status
from google import genai
from app.config.settings import settings


def get_genai_client() -> genai.Client:
    """Initializes and returns an instance of the official Google GenAI SDK Client.

    Returns:
        genai.Client instance.

    Raises:
        HTTPException: If GEMINI_API_KEY is missing.
    """
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GEMINI_API_KEY is not configured on the server.",
        )
    return genai.Client(api_key=settings.GEMINI_API_KEY)


def generate_content(prompt: str) -> str:
    """Executes a content generation request using the official Google GenAI SDK (gemini-2.5-flash).

    Args:
        prompt: Prompt string.

    Returns:
        Generated text response string.

    Raises:
        HTTPException: If API key is missing or request fails.
    """
    client = get_genai_client()
    try:
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL_NAME,
            contents=prompt,
        )
        return response.text
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error communicating with Google GenAI service: {str(e)}",
        )


def generate_json(prompt: str) -> Dict[str, Any]:
    """Generates structured JSON using Google GenAI SDK, stripping markdown code fences.

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
