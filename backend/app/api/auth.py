import hashlib
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token, decode_token
from app.core.formulas import calculate_targets
from app.models.user import User
from app.models.profile import UserProfile
from app.models.token import RefreshToken
from app.schemas.user import UserRegister, UserResponse, UserLogin
from app.schemas.token import Token, TokenRefreshRequest

router = APIRouter()

def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    # Check if user exists
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The user with this email already exists in the system.",
        )
    
    # Create User
    db_user = User(
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
    )
    db.add(db_user)
    db.flush()  # Populates db_user.id
    
    # Calculate calorie and macro targets
    p = user_in.profile
    calorie_target, carbs_g, protein_g, fat_g = calculate_targets(
        weight_kg=p.weight_kg,
        height_cm=p.height_cm,
        birth_date=p.birth_date,
        sex=p.sex,
        activity_level=p.activity_level,
        goal_type=p.goal_type
    )
    
    # Create Profile
    db_profile = UserProfile(
        user_id=db_user.id,
        name=p.name,
        sex=p.sex,
        birth_date=p.birth_date,
        height_cm=p.height_cm,
        weight_kg=p.weight_kg,
        activity_level=p.activity_level,
        goal_type=p.goal_type,
        target_weight_kg=p.target_weight_kg,
        calculated_calorie_target=calorie_target,
        calculated_protein_target_g=protein_g,
        calculated_carb_target_g=carbs_g,
        calculated_fat_target_g=fat_g
    )
    db.add(db_profile)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/login", response_model=Token)
def login(user_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_in.email).first()
    if not user or not verify_password(user_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
        
    # Generate tokens
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    
    # Decode refresh token to get expires_at
    payload = decode_token(refresh_token)
    expires_at = datetime.utcfromtimestamp(payload["exp"])
    
    # Store refresh token hash
    token_hash = hash_token(refresh_token)
    db_refresh_token = RefreshToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at
    )
    db.add(db_refresh_token)
    db.commit()
    
    return Token(access_token=access_token, refresh_token=refresh_token)

@router.post("/refresh", response_model=Token)
def refresh(refresh_in: TokenRefreshRequest, db: Session = Depends(get_db)):
    payload = decode_token(refresh_in.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user_id = payload.get("sub")
    token_hash = hash_token(refresh_in.refresh_token)
    
    # Find active token
    db_token = db.query(RefreshToken).filter(
        RefreshToken.token_hash == token_hash,
        RefreshToken.user_id == user_id,
        RefreshToken.revoked_at == None,
        RefreshToken.expires_at > datetime.utcnow()
    ).first()
    
    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is expired, revoked, or invalid"
        )
        
    # Revoke old token
    db_token.revoked_at = datetime.utcnow()
    
    # Generate new tokens
    access_token = create_access_token(user_id)
    new_refresh_token = create_refresh_token(user_id)
    
    # Store new refresh token
    new_payload = decode_token(new_refresh_token)
    new_expires_at = datetime.utcfromtimestamp(new_payload["exp"])
    new_token_hash = hash_token(new_refresh_token)
    
    db_new_token = RefreshToken(
        user_id=user_id,
        token_hash=new_token_hash,
        expires_at=new_expires_at
    )
    db.add(db_new_token)
    db.commit()
    
    return Token(access_token=access_token, refresh_token=new_refresh_token)
