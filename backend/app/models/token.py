"""SQLAlchemy model definition for Refresh Token revocation tracking."""

import uuid
from sqlalchemy import Column, DateTime, ForeignKey, String, func
from sqlalchemy.orm import relationship
from app.models.base import Base


class RefreshToken(Base):
    """SQLAlchemy model representing a stored refresh token hash.

    Attributes:
        id: Primary key UUID string.
        user_id: Foreign key linking to associated User.
        token_hash: SHA-256 hash string of the refresh token.
        issued_at: Token issue timestamp.
        expires_at: Token expiration timestamp.
        revoked_at: Optional revocation timestamp.
        user: Relationship back to associated User model instance.
    """

    __tablename__ = "refresh_tokens"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String, unique=True, index=True, nullable=False)
    issued_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="refresh_tokens")

