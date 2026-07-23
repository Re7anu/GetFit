"""SQLAlchemy model definition for User authentication accounts."""

import uuid
from sqlalchemy import Boolean, Column, DateTime, String, func
from sqlalchemy.orm import relationship
from app.db.models.base import Base


class UserAuth(Base):
    """SQLAlchemy model representing a user authentication account entity.

    Attributes:
        id: Primary key UUID string.
        email: Unique user authentication email address.
        password_hash: Bcrypt hashed password string.
        timezone: Preferred timezone string (default 'UTC').
        is_active: Account status flag.
        created_at: Creation timestamp.
        updated_at: Last update timestamp.
        profile: One-to-one relationship with UserProfile.
        refresh_tokens: One-to-many relationship with RefreshToken records.
    """

    __tablename__ = "user_auth"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    timezone = Column(String, default="UTC", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    refresh_tokens = relationship("RefreshToken", back_populates="user_auth", cascade="all, delete-orphan")
