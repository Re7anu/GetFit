import uuid
from sqlalchemy import Column, String, Float, Integer, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.models.base import Base

class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
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

    user = relationship("User", back_populates="profile")
