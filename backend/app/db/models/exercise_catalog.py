"""Database model for scientific exercise catalog and custom user exercises."""

from sqlalchemy import Column, String, Float, Integer, Boolean, ForeignKey
from app.db.models.base import Base


class ExerciseCatalogItem(Base):
    """SQLAlchemy model for exercise catalog definitions and custom user activities."""

    __tablename__ = "exercise_catalog"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    category = Column(String, nullable=False, index=True)  # 'distance', 'reps', 'time'
    muscle_group = Column(String, nullable=True, index=True)  # 'legs', 'chest', 'back', 'shoulders', 'arms', 'core', 'general'
    met = Column(Float, nullable=False, default=4.0)

    cadence_sec_per_rep = Column(Float, nullable=True)
    calories_per_km_per_kg = Column(Float, nullable=True)
    avg_speed_kmh = Column(Float, nullable=True)
    unit = Column(String, nullable=True)
    default_sets = Column(Integer, nullable=True)
    default_reps = Column(Integer, nullable=True)

    is_custom = Column(Boolean, nullable=False, default=False)
    created_by_user_id = Column(String, ForeignKey("user_auth.id", ondelete="CASCADE"), nullable=True)
