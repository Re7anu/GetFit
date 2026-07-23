"""User Profiles API endpoints module (Get Profile, Update Physical Metrics)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.auth_dependencies import get_current_user
from app.core.formulas import calculate_targets
from app.db.models.user_auth import UserAuth
from app.db.session import get_db
from app.schemas.profile import UserProfileUpdate
from app.schemas.user_auth import UserAuthResponse

router = APIRouter()


@router.get("/me", response_model=UserAuthResponse)
def read_user_me(current_user: UserAuth = Depends(get_current_user)):
    """Retrieves account details and physical profile for current authenticated user.

    Args:
        current_user: Authenticated UserAuth model instance injected by dependency.

    Returns:
        UserAuthResponse schema with user account and profile data.
    """
    return current_user


@router.put("/me", response_model=UserAuthResponse)
def update_user_profile(
    profile_in: UserProfileUpdate,
    current_user: UserAuth = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Updates physical profile metrics and automatically recalculates calorie targets.

    Args:
        profile_in: Partial profile update fields (weight, activity level, etc.).
        current_user: Authenticated User model instance.
        db: Database session instance.

    Returns:
        Updated User model instance with recalculated nutrition targets.

    Raises:
        HTTPException: If user profile record is missing.
    """
    profile = current_user.profile
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    # Update fields
    update_data = profile_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    # Recalculate calorie and macro targets
    calorie_target, carbs_g, protein_g, fat_g = calculate_targets(
        weight_kg=profile.weight_kg,
        height_cm=profile.height_cm,
        birth_date=profile.birth_date,
        sex=profile.sex,
        activity_level=profile.activity_level,
        goal_type=profile.goal_type,
    )

    profile.calculated_calorie_target = calorie_target
    profile.calculated_protein_target_g = protein_g
    profile.calculated_carb_target_g = carbs_g
    profile.calculated_fat_target_g = fat_g

    db.commit()
    db.refresh(current_user)
    return current_user

