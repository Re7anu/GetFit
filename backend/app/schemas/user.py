"""Pydantic schemas for User registration, login, and profile response serialization."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.profile import UserProfileCreate, UserProfileResponse


class UserBase(BaseModel):
    """Base Pydantic model containing common user fields."""

    email: str


class UserRegister(UserBase):
    """Pydantic model for user registration request payload."""

    password: str = Field(..., min_length=6)
    profile: UserProfileCreate


class UserLogin(UserBase):
    """Pydantic model for user authentication login request payload."""

    password: str


class UserResponse(UserBase):
    """Pydantic model for user account responses."""

    id: str
    is_active: bool
    timezone: str
    created_at: datetime
    profile: Optional[UserProfileResponse] = None

    model_config = ConfigDict(from_attributes=True)

