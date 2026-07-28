"""User Physical Profile API endpoints module (Onboarding, Get Profile, Update Metrics)."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.auth_dependencies import get_current_user
from app.db.models.user_auth import UserAuth
from app.db.session import get_db
from app.schemas.profile import UserProfileCreate, UserProfileResponse, UserProfileUpdate
from app.services import profile_service

router = APIRouter()


@router.post("", response_model=UserProfileResponse, status_code=status.HTTP_201_CREATED)
def create_user_profile(
    profile_in: UserProfileCreate,
    current_user: UserAuth = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Onboards user physical stats and calculates pre-computed targets."""
    return profile_service.create_profile_entry(db=db, user=current_user, profile_in=profile_in)


@router.get("/me", response_model=UserProfileResponse)
def read_my_profile(current_user: UserAuth = Depends(get_current_user)):
    """Retrieves physical profile stats and pre-computed target budgets for authenticated user."""
    return profile_service.get_user_profile(user=current_user)


@router.put("/me", response_model=UserProfileResponse)
def update_my_profile(
    profile_in: UserProfileUpdate,
    current_user: UserAuth = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Updates physical metrics and automatically recalculates BMR, TDEE, dynamic caloric pace, and daily targets."""
    return profile_service.update_profile_entry(db=db, user=current_user, profile_in=profile_in)
