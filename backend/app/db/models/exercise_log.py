"""SQLAlchemy model definition for User Exercise and Workout Logs."""

import uuid
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship
from app.db.models.base import Base


class ExerciseLog(Base):
    """SQLAlchemy model representing a logged exercise or workout session.

    Attributes:
        id: Primary key UUID string.
        user_id: Foreign key linking to UserAuth entity.
        logged_at: Timestamp when workout occurred/logged.
        exercise_name: Name of the exercise or sport.
        duration_minutes: Workout duration in minutes.
        met_value: Metabolic Equivalent of Task value.
        calories_burned: Total calculated calories burned in kcal.
        input_method: Entry method ('manual', 'gpx', 'cv_pose').
        notes: Optional workout notes or commentary.
        user_auth: Relationship back to associated UserAuth entity.
    """

    __tablename__ = "exercise_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("user_auth.id", ondelete="CASCADE"), nullable=False)
    logged_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    exercise_name = Column(String, nullable=False)
    duration_minutes = Column(Float, nullable=False)
    met_value = Column(Float, default=3.5, nullable=False)
    calories_burned = Column(Integer, nullable=False)
    input_method = Column(String, default="manual", nullable=False)
    notes = Column(String, nullable=True)

    user_auth = relationship("UserAuth", backref="exercise_logs")
