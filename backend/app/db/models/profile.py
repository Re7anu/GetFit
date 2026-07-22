"""SQLAlchemy model definition for User Profiles and nutrition targets."""

import uuid
from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship
from app.db.models.base import Base


class UserProfile(Base):
    """SQLAlchemy model representing user physical metrics and calculated targets.

    Attributes:
        id: Primary key UUID string.
        user_id: Foreign key linking to associated User.
        name: User display name.
        sex: Biological sex ('male' or 'female').
        birth_date: User birth date.
        height_cm: Height in centimeters.
        weight_kg: Current weight in kilograms.
        activity_level: Activity multiplier descriptor.
        goal_type: Primary fitness goal ('lose_weight', 'maintain', 'gain_muscle').
        target_weight_kg: Goal target weight in kilograms.
        calculated_calorie_target: Mifflin-St Jeor daily calorie budget.
        calculated_protein_target_g: Daily target protein in grams.
        calculated_carb_target_g: Daily target carbohydrates in grams.
        calculated_fat_target_g: Daily target fat in grams.
        updated_at: Timestamp of last metric or target update.
        user: Relationship back to associated User model instance.
    """

    __tablename__ = "user_profiles"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("user_auth.id", ondelete="CASCADE"), unique=True, nullable=False)
    name = Column(String, nullable=True)
    sex = Column(String, nullable=False)
    birth_date = Column(Date, nullable=False)
    height_cm = Column(Float, nullable=False)
    weight_kg = Column(Float, nullable=False)
    activity_level = Column(String, nullable=False)
    goal_type = Column(String, nullable=False)
    target_weight_kg = Column(Float, nullable=True)
    calculated_calorie_target = Column(Integer, nullable=False)
    calculated_protein_target_g = Column(Float, nullable=False)
    calculated_carb_target_g = Column(Float, nullable=False)
    calculated_fat_target_g = Column(Float, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user_auth = relationship("UserAuth", back_populates="profile")
