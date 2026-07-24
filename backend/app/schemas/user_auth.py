"""Pydantic schemas for User Authentication registration, login, and response serialization."""

import re
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.schemas.profile import UserProfileResponse


class UserAuthBase(BaseModel):
    """Base Pydantic model containing common user authentication fields."""

    email: str

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        """Validates that email contains '@' in the middle with a valid domain structure."""
        v = v.strip()
        pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        if not re.match(pattern, v):
            raise ValueError(
                "Invalid email format. Email must contain '@' in the middle and a valid domain (e.g. user@example.com)."
            )
        return v


class UserAuthRegister(UserAuthBase):
    """Pydantic model for user authentication registration request payload."""

    password: str = Field(..., min_length=8)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """Validates password complexity requirements.

        Requires:
            - Minimum 8 characters long.
            - At least 1 uppercase letter.
            - At least 1 lowercase letter.
            - At least 1 number.
            - At least 1 special character.
        """
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter.")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number.")
        if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?]", v):
            raise ValueError("Password must contain at least one special character.")
        return v


class UserAuthLogin(UserAuthBase):
    """Pydantic model for user authentication login request payload."""

    password: str


class UserAuthResponse(UserAuthBase):
    """Pydantic model for user account responses."""

    id: str
    is_active: bool
    timezone: str
    created_at: datetime
    profile: Optional[UserProfileResponse] = None

    model_config = ConfigDict(from_attributes=True)
