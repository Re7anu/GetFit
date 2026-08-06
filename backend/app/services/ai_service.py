"""Unified AI Service module using LiteLLM for multi-provider LLM integration, structured Pydantic output parsing, and automated model fallback cascades."""

import base64
import concurrent.futures
from typing import Optional, Type, TypeVar

import litellm
from fastapi import HTTPException, status
from pydantic import BaseModel

from app.config.settings import settings

T = TypeVar("T", bound=BaseModel)

# Suppress debug logs from LiteLLM in production
litellm.suppress_debug_info = True


def _get_api_key_for_model(model_name: str) -> Optional[str]:
    """Resolves API key based on configured model provider.

    Args:
        model_name: Provider-prefixed model identifier (e.g. 'gemini/gemini-1.5-flash').

    Returns:
        Configured API key string if available.
    """
    if model_name.startswith("gemini") or "gemini" in model_name:
        return settings.GEMINI_API_KEY
    if model_name.startswith("groq") or "groq" in model_name:
        return settings.GROQ_API_KEY
    return settings.GEMINI_API_KEY


def _build_fallbacks() -> Optional[list]:
    """Constructs model fallback cascade including secondary API key failover if configured."""
    fallbacks = []
    if settings.GEMINI_API_KEY_SECONDARY and settings.GEMINI_API_KEY_SECONDARY != settings.GEMINI_API_KEY:
        fallbacks.append({
            "model": settings.AI_MODEL_NAME,
            "api_key": settings.GEMINI_API_KEY_SECONDARY,
        })
    if settings.AI_FALLBACK_MODEL_NAME:
        fallbacks.append(settings.AI_FALLBACK_MODEL_NAME)
    return fallbacks if fallbacks else None


def generate_structured_output(prompt: str, response_schema: Type[T]) -> T:
    """Generates structured output directly parsed into a Pydantic model using LiteLLM.

    Args:
        prompt: Prompt string detailing the task or user input.
        response_schema: Pydantic model class defining the expected response schema.

    Returns:
        Validated instance of response_schema.

    Raises:
        HTTPException: If API key is missing, request times out, or API fails.
    """
    api_key = _get_api_key_for_model(settings.AI_MODEL_NAME)
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI API key is not configured on the server.",
        )

    fallbacks = _build_fallbacks()

    def _call_litellm():
        return litellm.completion(
            model=settings.AI_MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            response_format=response_schema,
            api_key=api_key,
            fallbacks=fallbacks,
            timeout=25.0,
        )

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(_call_litellm)
            response = future.result(timeout=25.0)

        raw_content = response.choices[0].message.content
        if not raw_content:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AI service returned an empty or unparseable structured response.",
            )
        return response_schema.model_validate_json(raw_content)
    except concurrent.futures.TimeoutError:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="AI API request timed out (25s limit reached). Please try again.",
        )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        err_msg = str(e)
        if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg or "Quota exceeded" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="AI API rate limit reached. Please wait 20-30 seconds before sending another request.",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error communicating with AI service via LiteLLM: {err_msg}",
        )


def generate_multimodal_structured_output(
    image_bytes: bytes,
    mime_type: str,
    prompt: str,
    response_schema: Type[T],
) -> T:
    """Generates structured output from an image + text prompt using LiteLLM.

    Args:
        image_bytes: Raw bytes of the image file.
        mime_type: MIME type of the image (e.g. 'image/jpeg', 'image/png').
        prompt: Detailed instruction prompt string.
        response_schema: Pydantic model class for output validation.

    Returns:
        Validated instance of response_schema.
    """
    api_key = _get_api_key_for_model(settings.AI_MODEL_NAME)
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI API key is not configured on the server.",
        )

    base64_image = base64.b64encode(image_bytes).decode("utf-8")
    data_url = f"data:{mime_type};base64,{base64_image}"

    fallbacks = _build_fallbacks()

    def _call_litellm_vision():
        return litellm.completion(
            model=settings.AI_MODEL_NAME,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": data_url}},
                    ],
                }
            ],
            response_format=response_schema,
            api_key=api_key,
            fallbacks=fallbacks,
            timeout=30.0,
        )

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(_call_litellm_vision)
            response = future.result(timeout=30.0)

        raw_content = response.choices[0].message.content
        if not raw_content:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AI Vision API returned an empty or unparseable response.",
            )
        return response_schema.model_validate_json(raw_content)
    except concurrent.futures.TimeoutError:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="AI Vision API request timed out (30s limit reached). Please try again.",
        )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        err_msg = str(e)
        if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg or "Quota exceeded" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="AI API rate limit reached. Please wait 20-30 seconds before sending another request.",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error communicating with AI Vision service via LiteLLM: {err_msg}",
        )
