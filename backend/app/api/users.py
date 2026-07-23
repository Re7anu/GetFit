"""User Account API endpoints module."""

from fastapi import APIRouter, Depends
from app.core.auth_dependencies import get_current_user
from app.db.models.user_auth import UserAuth
from app.schemas.user_auth import UserAuthResponse

router = APIRouter()


@router.get("/me", response_model=UserAuthResponse)
def read_user_me(current_user: UserAuth = Depends(get_current_user)):
    """Retrieves account details for current authenticated user.

    Args:
        current_user: Authenticated UserAuth model instance injected by dependency.

    Returns:
        UserAuthResponse schema with user account data.
    """
    return current_user
