"""Authentication API endpoints module (Registration, Login, Token Refresh)."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.token import Token, TokenRefreshRequest
from app.schemas.user_auth import UserAuthLogin, UserAuthRegister, UserAuthResponse
from app.services import auth_service

router = APIRouter()


@router.post("/register", response_model=UserAuthResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserAuthRegister, db: Session = Depends(get_db)):
    """Registers a new user account identity with email and password."""
    return auth_service.register_user(db=db, user_in=user_in)


@router.post("/login", response_model=Token)
def login(user_in: UserAuthLogin, db: Session = Depends(get_db)):
    """Authenticates user credentials and issues Access + Refresh token pair."""
    return auth_service.authenticate_user(db=db, user_in=user_in)


@router.post("/refresh", response_model=Token)
def refresh(refresh_in: TokenRefreshRequest, db: Session = Depends(get_db)):
    """Revokes current refresh token and issues a new access and refresh token pair."""
    return auth_service.refresh_user_session(db=db, refresh_in=refresh_in)
