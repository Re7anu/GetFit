"""User Profiles API endpoints module (Get Profile, Update Physical Metrics)."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.formulas import calculate_targets
from app.core.security import decode_token
from app.models.profile import UserProfile
from app.models.user import User
from app.schemas.profile import UserProfileUpdate
from app.schemas.user import UserResponse

router = APIRouter()
security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """Dependency that decodes Bearer JWT token and returns the current User entity.

    Args:
        credentials: Bearer HTTP Authorization credentials.
        db: Database session instance.

    Returns:
        Authenticated User model instance.

    Raises:
        HTTPException: If token is invalid, expired, or user is not found/inactive.
    """
    token = credentials.credentials
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    return user


@router.get("/me", response_model=UserResponse)
def read_user_me(current_user: User = Depends(get_current_user)):
    """Retrieves account details and physical profile for current authenticated user.

    Args:
        current_user: Authenticated User model instance injected by dependency.

    Returns:
        UserResponse schema with user account and profile data.
    """
    return current_user


@router.put("/me", response_model=UserResponse)
def update_user_profile(
    profile_in: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
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

