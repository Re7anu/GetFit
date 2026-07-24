"""Nutrition & Meal Logging API endpoints module."""

from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.auth_dependencies import get_current_user
from app.db.models.user_auth import UserAuth
from app.db.session import get_db
from app.schemas.food_log import AIFoodParseRequest, DailyNutritionSummary, FoodLogCreate, FoodLogResponse
from app.services import nutrition_service

router = APIRouter()


@router.post("/meals", response_model=FoodLogResponse, status_code=status.HTTP_201_CREATED)
def create_meal_log(
    meal_in: FoodLogCreate,
    current_user: UserAuth = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Logs a meal entry with calories and macronutrient breakdown for authenticated user."""
    return nutrition_service.create_meal_entry(db=db, user=current_user, meal_in=meal_in)


@router.post("/meals/ai-parse", response_model=FoodLogResponse, status_code=status.HTTP_201_CREATED)
def create_meal_log_via_ai(
    prompt_in: AIFoodParseRequest,
    current_user: UserAuth = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Parses natural language meal text using Gemini AI and logs the extracted calories and macros."""
    return nutrition_service.create_meal_entry_via_ai(db=db, user=current_user, prompt_in=prompt_in)


@router.get("/meals/today", response_model=List[FoodLogResponse])
def get_today_meals(
    current_user: UserAuth = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves all meals logged today by current authenticated user."""
    return nutrition_service.get_user_today_meals(db=db, user=current_user)


@router.get("/summary/today", response_model=DailyNutritionSummary)
def get_today_nutrition_summary(
    current_user: UserAuth = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Calculates today's consumed calories/macros vs adjusted target budget incorporating Net MET exercise credits."""
    return nutrition_service.calculate_user_today_nutrition_summary(db=db, user=current_user)
