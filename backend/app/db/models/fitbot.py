"""FitBot AI Coach Chatbot database models module."""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Integer
from sqlalchemy.orm import relationship
from app.db.models.base import Base


class FitBotSession(Base):
    """SQLAlchemy model representing a FitBot conversation session."""

    __tablename__ = "fitbot_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("user_auth.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False, default="New Chat")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    messages = relationship("FitBotChatMessage", back_populates="session", cascade="all, delete-orphan", order_by="FitBotChatMessage.created_at")


class FitBotChatMessage(Base):
    """SQLAlchemy model representing an individual message within a FitBot chat session."""

    __tablename__ = "fitbot_chat_messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("fitbot_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("user_auth.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # "user" or "assistant"
    message = Column(Text, nullable=False)
    
    # App navigation action fields (if assistant recommended tab navigation)
    navigation_target = Column(String(50), nullable=True)  # e.g., "nutrition", "workouts", "analytics"
    navigation_label = Column(String(100), nullable=True)  # e.g., "Open Meal Logger"
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    session = relationship("FitBotSession", back_populates="messages")
