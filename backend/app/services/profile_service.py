"""Profile domain service module handling physical onboarding and target recalculations."""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.core.formulas import calculate_profile_targets
from app.db.models.profile import UserProfile
from app.db.models.user_auth import UserAuth
from app.schemas.profile import UserProfileCreate, UserProfileUpdate


def create_profile_entry(db: Session, user: UserAuth, profile_in: UserProfileCreate) -> UserProfile:
    """Onboards user physical stats and calculates pre-computed target metrics.

    Args:
        db: Database session.
        user: Authenticated UserAuth entity.
        profile_in: Onboarding physical profile payload.

    Returns:
        Created UserProfile model instance.

    Raises:
        HTTPException: If profile already exists.
    """
    if user.profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile already exists for this user. Use PUT /profiles/me to update metrics.",
        )

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
        user_id=user.id,
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


def get_user_profile(user: UserAuth) -> UserProfile:
    """Retrieves physical profile for the user.

    Args:
        user: Authenticated UserAuth entity.

    Returns:
        UserProfile model instance.

    Raises:
        HTTPException: If profile not found.
    """
    if not user.profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Physical profile not found. Please complete profile onboarding via POST /profiles.",
        )
    return user.profile


def update_profile_entry(db: Session, user: UserAuth, profile_in: UserProfileUpdate) -> UserProfile:
    """Updates physical profile metrics and recalculates target engine.

    Args:
        db: Database session.
        user: Authenticated UserAuth entity.
        profile_in: Partial profile update fields.

    Returns:
        Updated UserProfile model instance.

    Raises:
        HTTPException: If profile not found.
    """
    profile = user.profile
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Physical profile not found. Please complete profile onboarding via POST /profiles.",
        )

    update_data = profile_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

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
