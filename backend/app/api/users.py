from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_token
from app.core.formulas import calculate_targets
from app.models.user import User
from app.models.profile import UserProfile
from app.schemas.user import UserResponse
from app.schemas.profile import UserProfileUpdate

router = APIRouter()
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)) -> User:
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
    return current_user

@router.put("/me", response_model=UserResponse)
def update_user_profile(
    profile_in: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
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
        goal_type=profile.goal_type
    )
    
    profile.calculated_calorie_target = calorie_target
    profile.calculated_protein_target_g = protein_g
    profile.calculated_carb_target_g = carbs_g
    profile.calculated_fat_target_g = fat_g
    
    db.commit()
    db.refresh(current_user)
    return current_user
