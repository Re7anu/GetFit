"""SQLAlchemy model definition for User Physical Profiles and pre-computed targets."""

import uuid
from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship
from app.db.models.base import Base


class UserProfile(Base):
    """SQLAlchemy model representing user physical metrics, pre-computed BMR/TDEE, and daily target budgets.

    Attributes:
        id: Primary key UUID string.
        user_id: Foreign key linking to associated UserAuth entity.
        name: User display name.
        sex: Biological sex ('male' or 'female').
        birth_date: User birth date.
        height_cm: Height in centimeters.
        weight_kg: Current weight in kilograms.
        target_weight_kg: Goal target weight in kilograms.
        timeline_weeks: Timeframe in weeks to achieve target weight.
        activity_level: Activity multiplier descriptor.
        bmr: Pre-computed Basal Metabolic Rate in kcal.
        tdee: Pre-computed Total Daily Energy Expenditure in kcal.
        caloric_pace_kcal_per_day: Dynamic daily calorie deficit or surplus.
        goal_type: Derived goal category ('lose_weight', 'maintain', 'gain_muscle').
        calculated_calorie_target: Daily target calorie budget.
        calculated_protein_target_g: Daily target protein in grams.
        calculated_carb_target_g: Daily target carbohydrates in grams.
        calculated_fat_target_g: Daily target fat in grams.
        is_safe_pace: Flag indicating whether weight change pace is within safe medical limits.
        suggested_min_weeks: Suggested minimum timeline in weeks for safe weight loss.
        updated_at: Timestamp of last metric or target update.
        user_auth: Relationship back to associated UserAuth entity.
    """

    __tablename__ = "user_profiles"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("user_auth.id", ondelete="CASCADE"), unique=True, nullable=False)
    name = Column(String, nullable=True)
    gender = Column(String, nullable=False)
    birth_date = Column(Date, nullable=False)
    height_cm = Column(Float, nullable=False)
    weight_kg = Column(Float, nullable=False)
    target_weight_kg = Column(Float, nullable=False)
    timeline_weeks = Column(Integer, default=12, nullable=False)
    activity_level = Column(String, nullable=False)

    bmr = Column(Float, nullable=False)
    tdee = Column(Float, nullable=False)
    caloric_pace_kcal_per_day = Column(Float, nullable=False)
    goal_type = Column(String, nullable=False)

    calculated_calorie_target = Column(Integer, nullable=False)
    calculated_protein_target_g = Column(Float, nullable=False)
    calculated_carb_target_g = Column(Float, nullable=False)
    calculated_fat_target_g = Column(Float, nullable=False)

    is_safe_pace = Column(Boolean, default=True, nullable=False)
    suggested_min_weeks = Column(Integer, nullable=False)

    fitness_focus = Column(String, default="athletic", nullable=False)
    weekly_schedule_json = Column(String, nullable=True)

    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user_auth = relationship("UserAuth", back_populates="profile")
