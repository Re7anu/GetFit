"""Pydantic schemas for authentication JWT tokens and token refresh requests."""

from typing import Optional
from pydantic import BaseModel


class Token(BaseModel):
    """Pydantic model representing JWT access and refresh token response."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    """Pydantic model representing decoded JWT payload fields."""

    sub: Optional[str] = None
    type: Optional[str] = None


class TokenRefreshRequest(BaseModel):
    """Pydantic model representing a token refresh request payload."""

    refresh_token: str

