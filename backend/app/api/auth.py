"""Authentication API endpoints module (Registration, Login, Token Refresh)."""

import hashlib
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.formulas import calculate_targets
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)
from app.models.profile import UserProfile
from app.models.token import RefreshToken
from app.models.user import User
from app.schemas.token import Token, TokenRefreshRequest
from app.schemas.user import UserLogin, UserRegister, UserResponse

router = APIRouter()


def hash_token(token: str) -> str:
    """Computes a SHA-256 hash digest for storing refresh tokens securely.

    Args:
        token: Raw refresh token string.

    Returns:
        Hexadecimal SHA-256 string.
    """
    return hashlib.sha256(token.encode()).hexdigest()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    """Registers a new user account and calculates initial daily nutrition targets.

    Args:
        user_in: Registration payload containing email, password, and profile metrics.
        db: Database session instance.

    Returns:
        Created User model instance with profile and calculated targets.

    Raises:
        HTTPException: If email is already registered.
    """
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
        goal_type=p.goal_type,
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
        calculated_fat_target_g=fat_g,
    )
    db.add(db_profile)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.post("/login", response_model=Token)
def login(user_in: UserLogin, db: Session = Depends(get_db)):
    """Authenticates user credentials and issues Access + Refresh token pair.

    Args:
        user_in: Login credentials payload (email and password).
        db: Database session instance.

    Returns:
        Token schema containing access_token and refresh_token.

    Raises:
        HTTPException: If credentials are invalid or user account is inactive.
    """
    user = db.query(User).filter(User.email == user_in.email).first()
    if not user or not verify_password(user_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user",
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
        expires_at=expires_at,
    )
    db.add(db_refresh_token)
    db.commit()

    return Token(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=Token)
def refresh(refresh_in: TokenRefreshRequest, db: Session = Depends(get_db)):
    """Revokes current refresh token and issues a new access and refresh token pair.

    Args:
        refresh_in: Refresh token payload.
        db: Database session instance.

    Returns:
        New Token schema with fresh access and refresh tokens.

    Raises:
        HTTPException: If token is invalid, expired, or previously revoked.
    """
    payload = decode_token(refresh_in.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user_id = payload.get("sub")
    token_hash = hash_token(refresh_in.refresh_token)

    # Find active token
    db_token = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.token_hash == token_hash,
            RefreshToken.user_id == user_id,
            RefreshToken.revoked_at == None,
            RefreshToken.expires_at > datetime.utcnow(),
        )
        .first()
    )

    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is expired, revoked, or invalid",
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
        expires_at=new_expires_at,
    )
    db.add(db_new_token)
    db.commit()

    return Token(access_token=access_token, refresh_token=new_refresh_token)

