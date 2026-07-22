"""Pydantic schemas for User Authentication registration, login, and response serialization."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.profile import UserProfileCreate, UserProfileResponse


class UserAuthBase(BaseModel):
    """Base Pydantic model containing common user authentication fields."""

    email: str


class UserAuthRegister(UserAuthBase):
    """Pydantic model for user authentication registration request payload."""

    password: str = Field(..., min_length=6)
    profile: UserProfileCreate


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
