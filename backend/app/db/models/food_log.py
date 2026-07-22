"""SQLAlchemy model definition for User Food and Meal Logs."""

import uuid
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship
from app.db.models.base import Base


class FoodLog(Base):
    """SQLAlchemy model representing a logged meal or food item.

    Attributes:
        id: Primary key UUID string.
        user_id: Foreign key linking to UserAuth entity.
        logged_at: Timestamp when meal was eaten/logged.
        meal_type: Category ('breakfast', 'lunch', 'dinner', 'snack').
        description: Food description or item name.
        calories: Total calories in kilocalories.
        protein_g: Protein amount in grams.
        carbs_g: Carbohydrate amount in grams.
        fat_g: Fat amount in grams.
        quantity_g: Optional weight in grams.
        input_method: Method used to enter meal ('manual', 'photo', 'text').
        user_auth: Relationship back to associated UserAuth entity.
    """

    __tablename__ = "food_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("user_auth.id", ondelete="CASCADE"), nullable=False)
    logged_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    meal_type = Column(String, nullable=False)
    description = Column(String, nullable=False)
    calories = Column(Integer, nullable=False)
    protein_g = Column(Float, default=0.0, nullable=False)
    carbs_g = Column(Float, default=0.0, nullable=False)
    fat_g = Column(Float, default=0.0, nullable=False)
    quantity_g = Column(Float, nullable=True)
    input_method = Column(String, default="manual", nullable=False)

    user_auth = relationship("UserAuth", backref="food_logs")
