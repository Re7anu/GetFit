"""User Physical Profile API endpoints module (Onboarding, Get Profile, Update Metrics)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.auth_dependencies import get_current_user
from app.core.formulas import calculate_profile_targets
from app.db.models.profile import UserProfile
from app.db.models.user_auth import UserAuth
from app.db.session import get_db
from app.schemas.profile import UserProfileCreate, UserProfileResponse, UserProfileUpdate

router = APIRouter()


@router.post("", response_model=UserProfileResponse, status_code=status.HTTP_201_CREATED)
def create_user_profile(
    profile_in: UserProfileCreate,
    current_user: UserAuth = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Onboards user physical stats, calculates BMR, TDEE, dynamic caloric pace, and daily targets.

    Args:
        profile_in: Onboarding physical profile payload.
        current_user: Authenticated UserAuth model instance.
        db: Database session instance.

    Returns:
        Created UserProfile model instance.

    Raises:
        HTTPException: If profile already exists for this user.
    """
    if current_user.profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile already exists for this user. Use PUT /profiles/me to update metrics.",
        )

    # Run single-pass target engine calculation
    targets = calculate_profile_targets(
        weight_kg=profile_in.weight_kg,
        height_cm=profile_in.height_cm,
        birth_date=profile_in.birth_date,
        sex=profile_in.sex,
        activity_level=profile_in.activity_level,
        target_weight_kg=profile_in.target_weight_kg,
        timeline_weeks=profile_in.timeline_weeks,
    )

    db_profile = UserProfile(
        user_id=current_user.id,
        name=profile_in.name,
        sex=profile_in.sex,
        birth_date=profile_in.birth_date,
        height_cm=profile_in.height_cm,
        weight_kg=profile_in.weight_kg,
        target_weight_kg=profile_in.target_weight_kg,
        timeline_weeks=profile_in.timeline_weeks,
        activity_level=profile_in.activity_level,
        bmr=targets["bmr"],
        tdee=targets["tdee"],
        caloric_pace_kcal_per_day=targets["caloric_pace_kcal_per_day"],
        goal_type=targets["goal_type"],
        calculated_calorie_target=targets["calculated_calorie_target"],
        calculated_protein_target_g=targets["calculated_protein_target_g"],
        calculated_carb_target_g=targets["calculated_carb_target_g"],
        calculated_fat_target_g=targets["calculated_fat_target_g"],
        is_safe_pace=targets["is_safe_pace"],
        suggested_min_weeks=targets["suggested_min_weeks"],
    )
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    return db_profile


@router.get("/me", response_model=UserProfileResponse)
def read_my_profile(current_user: UserAuth = Depends(get_current_user)):
    """Retrieves physical profile stats and pre-computed target budgets for authenticated user.

    Args:
        current_user: Authenticated UserAuth model instance.

    Returns:
        UserProfileResponse schema instance.

    Raises:
        HTTPException: If user profile has not been created yet.
    """
    if not current_user.profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Physical profile not found. Please complete profile onboarding via POST /profiles.",
        )
    return current_user.profile


@router.put("/me", response_model=UserProfileResponse)
def update_my_profile(
    profile_in: UserProfileUpdate,
    current_user: UserAuth = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Updates physical metrics and automatically recalculates BMR, TDEE, dynamic caloric pace, and daily targets.

    Args:
        profile_in: Partial profile update fields.
        current_user: Authenticated UserAuth model instance.
        db: Database session instance.

    Returns:
        Updated UserProfile model instance.

    Raises:
        HTTPException: If profile record is missing.
    """
    profile = current_user.profile
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Physical profile not found. Please complete profile onboarding via POST /profiles.",
        )

    # Update provided fields
    update_data = profile_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    # Auto-recalculate target engine
    targets = calculate_profile_targets(
        weight_kg=profile.weight_kg,
        height_cm=profile.height_cm,
        birth_date=profile.birth_date,
        sex=profile.sex,
        activity_level=profile.activity_level,
        target_weight_kg=profile.target_weight_kg,
        timeline_weeks=profile.timeline_weeks,
    )

    profile.bmr = targets["bmr"]
    profile.tdee = targets["tdee"]
    profile.caloric_pace_kcal_per_day = targets["caloric_pace_kcal_per_day"]
    profile.goal_type = targets["goal_type"]
    profile.calculated_calorie_target = targets["calculated_calorie_target"]
    profile.calculated_protein_target_g = targets["calculated_protein_target_g"]
    profile.calculated_carb_target_g = targets["calculated_carb_target_g"]
    profile.calculated_fat_target_g = targets["calculated_fat_target_g"]
    profile.is_safe_pace = targets["is_safe_pace"]
    profile.suggested_min_weeks = targets["suggested_min_weeks"]

    db.commit()
    db.refresh(profile)
    return profile
