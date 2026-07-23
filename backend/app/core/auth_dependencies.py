"""Authentication dependency injection guards module for FastAPI request validation."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from app.core.auth_security import decode_token
from app.db.models.user_auth import UserAuth
from app.db.session import get_db

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> UserAuth:
    """Dependency that decodes Bearer JWT token and returns the current UserAuth entity.

    Args:
        credentials: Bearer HTTP Authorization credentials.
        db: Database session instance.

    Returns:
        Authenticated UserAuth model instance.

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
    user = db.query(UserAuth).filter(UserAuth.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    return user
