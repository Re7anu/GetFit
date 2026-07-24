"""SQLAlchemy model definition for User Workout and Exercise Log entries."""

import uuid
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship
from app.db.models.base import Base


class ExerciseLog(Base):
    """SQLAlchemy model representing a workout or physical exercise log entry.

    Attributes:
        id: Primary key UUID string.
        user_id: Foreign key linking to associated UserAuth entity.
        logged_at: Timestamp of workout entry (defaults to current time).
        exercise_name: Title/name of exercise or sport.
        duration_minutes: Workout duration in minutes.
        met_value: Scientific MET (Metabolic Equivalent of Task) value.
        calories_burned: Net calories burned calculated using Solution A (Net MET).
        input_method: Logging method ('manual', 'wearable', 'ai_vision').
        notes: Optional workout notes or performance description.
        user_auth: Relationship back to associated UserAuth entity.
    """

    __tablename__ = "exercise_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("user_auth.id", ondelete="CASCADE"), nullable=False, index=True)
    logged_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    exercise_name = Column(String, nullable=False)
    duration_minutes = Column(Float, nullable=False)
    met_value = Column(Float, default=3.5, nullable=False)
    calories_burned = Column(Integer, nullable=False)
    input_method = Column(String, default="manual", nullable=False)
    notes = Column(String, nullable=True)

    user_auth = relationship("UserAuth", backref="exercise_logs")
