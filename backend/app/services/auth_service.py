"""Authentication domain service module handling user registration, authentication, and session tokens."""

import hashlib
from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.core.auth_security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)
from app.db.models.token import RefreshToken
from app.db.models.user_auth import UserAuth
from app.schemas.token import Token, TokenRefreshRequest
from app.schemas.user_auth import UserAuthLogin, UserAuthRegister


def hash_token(token: str) -> str:
    """Computes a SHA-256 hash digest for storing refresh tokens securely."""
    return hashlib.sha256(token.encode()).hexdigest()


def register_user(db: Session, user_in: UserAuthRegister) -> UserAuth:
    """Registers a new user authentication entity.

    Args:
        db: Database session.
        user_in: Registration payload.

    Returns:
        Created UserAuth model instance.

    Raises:
        HTTPException: If email already exists.
    """
    user = db.query(UserAuth).filter(UserAuth.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The user with this email already exists in the system.",
        )

    db_user = UserAuth(
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def authenticate_user(db: Session, user_in: UserAuthLogin) -> Token:
    """Authenticates credentials and issues Access + Refresh token pair.

    Args:
        db: Database session.
        user_in: Login credentials.

    Returns:
        Token schema containing access_token and refresh_token.

    Raises:
        HTTPException: If invalid credentials or inactive user.
    """
    user = db.query(UserAuth).filter(UserAuth.email == user_in.email).first()
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

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    payload = decode_token(refresh_token)
    expires_at = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)

    token_hash = hash_token(refresh_token)
    db_refresh_token = RefreshToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    db.add(db_refresh_token)
    db.commit()

    return Token(access_token=access_token, refresh_token=refresh_token)


def refresh_user_session(db: Session, refresh_in: TokenRefreshRequest) -> Token:
    """Revokes old refresh token and issues fresh token pair.

    Args:
        db: Database session.
        refresh_in: Refresh token payload.

    Returns:
        New Token schema instance.

    Raises:
        HTTPException: If token is invalid, expired, or revoked.
    """
    payload = decode_token(refresh_in.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user_id = payload.get("sub")
    token_hash = hash_token(refresh_in.refresh_token)

    now_utc = datetime.now(timezone.utc)
    db_token = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.token_hash == token_hash,
            RefreshToken.user_id == user_id,
            RefreshToken.revoked_at == None,
            RefreshToken.expires_at > now_utc,
        )
        .first()
    )

    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is expired, revoked, or invalid",
        )

    db_token.revoked_at = now_utc

    access_token = create_access_token(user_id)
    new_refresh_token = create_refresh_token(user_id)

    new_payload = decode_token(new_refresh_token)
    new_expires_at = datetime.fromtimestamp(new_payload["exp"], tz=timezone.utc)
    new_token_hash = hash_token(new_refresh_token)

    db_new_token = RefreshToken(
        user_id=user_id,
        token_hash=new_token_hash,
        expires_at=new_expires_at,
    )
    db.add(db_new_token)
    db.commit()

    return Token(access_token=access_token, refresh_token=new_refresh_token)
