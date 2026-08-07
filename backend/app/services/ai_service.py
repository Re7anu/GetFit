"""Unified AI Service module using LiteLLM for multi-provider LLM integration, structured Pydantic output parsing, and automated model fallback cascades."""

import base64
from typing import Optional, Type, TypeVar

import litellm
from fastapi import HTTPException, status
from loguru import logger
from pydantic import BaseModel

from app.config.settings import settings

T = TypeVar("T", bound=BaseModel)

# Suppress debug logs from LiteLLM in production
litellm.suppress_debug_info = True


def _get_api_key_for_model(model_name: str) -> Optional[str]:
    """Resolves API key based on configured model provider.

    Args:
        model_name: Provider-prefixed model identifier (e.g. 'groq/llama-3.3-70b-versatile' or 'gemini/gemini-2.0-flash').

    Returns:
        Configured API key string if available.
    """
    if model_name.startswith("groq/"):
        return settings.GROQ_API_KEY or settings.GEMINI_API_KEY or settings.LLM_API_KEY
    if model_name.startswith("gemini/"):
        return settings.GEMINI_API_KEY or settings.LLM_API_KEY
    return settings.GEMINI_API_KEY or settings.LLM_API_KEY


def _build_fallbacks() -> Optional[list]:
    """Constructs model fallback cascade with provider-specific API keys."""
    if not settings.LLM_FALLBACK_MODEL_NAME or settings.LLM_FALLBACK_MODEL_NAME == settings.LLM_MODEL_NAME:
        return None

    fallback_key = _get_api_key_for_model(settings.LLM_FALLBACK_MODEL_NAME)
    if not fallback_key:
        return None

    return [{
        "model": settings.LLM_FALLBACK_MODEL_NAME,
        "api_key": fallback_key,
    }]


def _run_litellm_completion(messages: list, response_schema: Type[T], timeout: float = 25.0) -> T:
    """Helper that executes LiteLLM completion with parameter-driven messages, fallbacks, and error handling.

    Args:
        messages: List of OpenAI-compatible message dictionaries.
        response_schema: Pydantic model class for output validation.
        timeout: Execution timeout in seconds.

    Returns:
        Validated instance of response_schema.
    """
    api_key = _get_api_key_for_model(settings.LLM_MODEL_NAME)
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI API key is not configured on the server.",
        )

    fallbacks = _build_fallbacks()
    logger.info("Executing LiteLLM completion (model='{}', fallbacks={})", settings.LLM_MODEL_NAME, fallbacks)

    try:
        response = litellm.completion(
            model=settings.LLM_MODEL_NAME,
            messages=messages,
            response_format=response_schema,
            api_key=api_key,
            fallbacks=fallbacks,
            timeout=timeout,
        )

        raw_content = response.choices[0].message.content
        if not raw_content:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AI service returned an empty or unparseable response.",
            )
        return response_schema.model_validate_json(raw_content)
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        err_msg = str(e)
        if "timeout" in err_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail=f"AI API request timed out ({int(timeout)}s limit reached). Please try again.",
            )
        if any(k in err_msg for k in ["429", "RESOURCE_EXHAUSTED", "Quota exceeded", "RateLimitError", "RateLimit"]):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Gemini API rate limit / free quota exceeded. Please wait 30–60 seconds before sending another request.",
            )
        if "NotFoundError" in err_msg or "not found for API version" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Gemini API rate limit reached on primary model and fallback model. Please wait 30–60 seconds.",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error communicating with AI service via LiteLLM: {err_msg}",
        )


def generate_structured_output(prompt: str, response_schema: Type[T]) -> T:
    """Generates structured output directly parsed into a Pydantic model using LiteLLM.

    Args:
        prompt: Prompt string detailing the task or user input.
        response_schema: Pydantic model class defining the expected response schema.

    Returns:
        Validated instance of response_schema.
    """
    messages = [{"role": "user", "content": prompt}]
    return _run_litellm_completion(messages=messages, response_schema=response_schema, timeout=25.0)


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
    base64_image = base64.b64encode(image_bytes).decode("utf-8")
    data_url = f"data:{mime_type};base64,{base64_image}"
    messages = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": data_url}},
            ],
        }
    ]
    return _run_litellm_completion(messages=messages, response_schema=response_schema, timeout=30.0)
