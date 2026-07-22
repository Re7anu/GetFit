from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional
from app.schemas.profile import UserProfileResponse, UserProfileCreate

class UserBase(BaseModel):
    email: str

class UserRegister(UserBase):
    password: str = Field(..., min_length=6)
    # Profile details are required at registration to set up initial targets
    profile: UserProfileCreate

class UserLogin(UserBase):
    password: str

class UserResponse(UserBase):
    id: str
    is_active: bool
    timezone: str
    created_at: datetime
    profile: Optional[UserProfileResponse] = None

    model_config = ConfigDict(from_attributes=True)
