"""Health and Workout Analytics API Router Module."""

from typing import List
from fastapi import APIRouter, Depends, Query as FastAPIQuery
from sqlalchemy.orm import Session
from app.core.auth_dependencies import get_current_user
from app.db.models.user_auth import UserAuth
from app.db.session import get_db
from app.schemas.analytics import DailyHistorySnapshot
from app.services import analytics_service

router = APIRouter()


@router.get("/history", response_model=List[DailyHistorySnapshot])
def get_nutrition_history(
    days: int = FastAPIQuery(30, ge=1, le=365, description="Number of past days to query"),
    current_user: UserAuth = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Calculates daily historical performance snapshots evaluating calorie & protein goals."""
    return analytics_service.get_user_nutrition_history(db=db, user=current_user, days=days)


@router.get("/day-detail")
def get_day_detail(
    date: str = FastAPIQuery(..., description="Target date formatted as YYYY-MM-DD"),
    current_user: UserAuth = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves full detailed food & exercise logs for a specific date."""
    return analytics_service.get_day_detail_summary(db=db, user=current_user, target_date_str=date)
