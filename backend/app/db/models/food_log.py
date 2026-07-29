"""SQLAlchemy model definition for User Food and Meal Log entries with Macronutrient and Micronutrient tracking."""

import uuid
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship
from app.db.models.base import Base


class FoodLog(Base):
    """SQLAlchemy model representing a food or meal logging entry with macros and micros.

    Attributes:
        id: Primary key UUID string.
        user_id: Foreign key linking to associated UserAuth entity.
        logged_at: Timestamp of meal entry (defaults to current time).
        meal_type: Category of meal ('breakfast', 'lunch', 'dinner', 'snack').
        description: Freeform description of food item or meal.
        calories: Total energy content in kilocalories.
        protein_g: Protein content in grams.
        carbs_g: Carbohydrate content in grams.
        fat_g: Fat content in grams.
        fiber_g: Dietary fiber in grams.
        sodium_mg: Sodium in milligrams.
        potassium_mg: Potassium in milligrams.
        vitamin_c_mg: Vitamin C in milligrams.
        calcium_mg: Calcium in milligrams.
        iron_mg: Iron in milligrams.
        quantity_g: Optional weight/portion size in grams.
        input_method: Logging method used ('manual', 'ai_nlp', 'barcode').
        user_auth: Relationship back to associated UserAuth entity.
    """

    __tablename__ = "food_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("user_auth.id", ondelete="CASCADE"), nullable=False, index=True)
    logged_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    meal_type = Column(String, nullable=False)
    description = Column(String, nullable=False)
    calories = Column(Integer, nullable=False)
    protein_g = Column(Float, default=0.0, nullable=False)
    carbs_g = Column(Float, default=0.0, nullable=False)
    fat_g = Column(Float, default=0.0, nullable=False)
    
    # Essential Micronutrients
    fiber_g = Column(Float, default=0.0, nullable=False)
    sodium_mg = Column(Float, default=0.0, nullable=False)
    potassium_mg = Column(Float, default=0.0, nullable=False)
    vitamin_c_mg = Column(Float, default=0.0, nullable=False)
    calcium_mg = Column(Float, default=0.0, nullable=False)
    iron_mg = Column(Float, default=0.0, nullable=False)

    quantity_g = Column(Float, nullable=True)
    input_method = Column(String, default="manual", nullable=False)

    user_auth = relationship("UserAuth", backref="food_logs")
