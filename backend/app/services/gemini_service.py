"""Google Gemini AI Service module using official google-genai SDK structured outputs with response_schema."""

from typing import Type, TypeVar
from fastapi import HTTPException, status
from google import genai
from google.genai import types
from pydantic import BaseModel
from app.config.settings import settings

T = TypeVar("T", bound=BaseModel)


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


def generate_structured_output(prompt: str, response_schema: Type[T]) -> T:
    """Generates structured output directly parsed into a Pydantic model using official Google GenAI SDK.

    Args:
        prompt: Prompt string detailing the task or user input.
        response_schema: Pydantic model class defining the expected response schema.

    Returns:
        Validated instance of the provided Pydantic model class (response.parsed).

    Raises:
        HTTPException: If API key is missing or request fails.
    """
    client = get_genai_client()
    try:
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL_NAME,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=response_schema,
            ),
        )
        if not response.parsed:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Gemini API returned an empty or unparseable structured response.",
            )
        return response.parsed
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error communicating with Google GenAI service: {str(e)}",
        )
