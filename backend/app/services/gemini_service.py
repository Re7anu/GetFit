"""Google Gemini AI Service module using official google-genai SDK structured outputs with response_schema."""

import concurrent.futures
import time
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
        HTTPException: If API key is missing, request times out (10s limit), or API fails.
    """
    client = get_genai_client()

    def _call_gemini():
        return client.models.generate_content(
            model=settings.GEMINI_MODEL_NAME,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=response_schema,
            ),
        )

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(_call_gemini)
            response = future.result(timeout=25.0)

        if not response.parsed:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Gemini API returned an empty or unparseable structured response.",
            )
        return response.parsed
    except concurrent.futures.TimeoutError:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Google GenAI API request timed out (25s limit reached). Please try again.",
        )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        err_msg = str(e)
        if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg or "Quota exceeded" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Google Gemini API rate limit reached (Free Tier limit). Please wait 20-30 seconds before sending another AI request.",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error communicating with Google GenAI service: {err_msg}",
        )


def generate_multimodal_structured_output(
    image_bytes: bytes,
    mime_type: str,
    prompt: str,
    response_schema: Type[T],
) -> T:
    """Generates structured output from an image + text prompt using official Google GenAI SDK.

    Args:
        image_bytes: Raw bytes of the image file.
        mime_type: MIME type of the image (e.g. 'image/jpeg', 'image/png', 'image/webp').
        prompt: Detailed instruction prompt string.
        response_schema: Pydantic model class for output validation.

    Returns:
        Validated instance of response_schema.
    """
    client = get_genai_client()

    image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
    contents = [image_part, prompt]

    def _call_gemini_vision():
        return client.models.generate_content(
            model=settings.GEMINI_MODEL_NAME,
            contents=contents,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=response_schema,
            ),
        )

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(_call_gemini_vision)
            response = future.result(timeout=30.0)

        if not response.parsed:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Gemini Vision API returned an empty or unparseable response.",
            )
        return response.parsed
    except concurrent.futures.TimeoutError:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Google GenAI Vision API request timed out (30s limit reached). Please try again.",
        )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        err_msg = str(e)
        if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg or "Quota exceeded" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Google Gemini API rate limit reached (Free Tier limit). Please wait 20-30 seconds before sending another AI request.",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error communicating with Google GenAI service: {err_msg}",
        )
