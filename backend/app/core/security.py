"""Security utilities module for password hashing and JWT token management."""

from datetime import datetime, timedelta
from typing import Any, Optional, Union
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core.settings import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain text password against a stored bcrypt hash.

    Args:
        plain_password: Plain text password string.
        hashed_password: Stored bcrypt hashed password string.

    Returns:
        True if password matches hash, False otherwise.
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Generates a secure bcrypt hash for a plain text password.

    Args:
        password: Plain text password string.

    Returns:
        Bcrypt hashed password string.
    """
    return pwd_context.hash(password)


def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Encodes a signed short-lived JWT Access Token for authentication.

    Args:
        subject: Subject identifier (typically user ID).
        expires_delta: Optional custom token expiration duration.

    Returns:
        Encoded JWT access token string.
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"exp": expire, "sub": str(subject), "type": "access"}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Encodes a signed long-lived JWT Refresh Token for session renewal.

    Args:
        subject: Subject identifier (typically user ID).
        expires_delta: Optional custom token expiration duration.

    Returns:
        Encoded JWT refresh token string.
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode = {"exp": expire, "sub": str(subject), "type": "refresh"}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[dict]:
    """Decodes and validates a signed JWT token string.

    Args:
        token: JWT string to decode and verify.

    Returns:
        Decoded payload dictionary if valid, None if invalid or expired.
    """
    try:
        decoded_token = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return decoded_token
    except JWTError:
        return None

