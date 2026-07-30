"""Health and Workout Analytics API Router Module."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query as FastAPIQuery
from sqlalchemy.orm import Session
from app.core.auth_dependencies import get_current_user
from app.db.models.user_auth import UserAuth
from app.db.session import get_db
from app.schemas.analytics import AnalyticsHistoryResponse, DailyHistorySnapshot, DayDetailResponse
from app.services import analytics_service

router = APIRouter()


@router.get("/history", response_model=AnalyticsHistoryResponse)
def get_nutrition_history(
    days: int = FastAPIQuery(30, ge=1, le=365, description="Number of past days to query"),
    current_user: UserAuth = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Calculates daily historical performance snapshots evaluating calorie & protein goals."""
    return analytics_service.get_user_nutrition_history(db=db, user=current_user, days=days)


@router.get("/day-detail", response_model=DayDetailResponse)
def get_day_detail(
    date: Optional[str] = FastAPIQuery(None, description="Target date formatted as YYYY-MM-DD"),
    target_date: Optional[str] = FastAPIQuery(None, description="Alternative date parameter"),
    current_user: UserAuth = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves full detailed food & exercise logs for a specific date."""
    target_str = date or target_date
    if not target_str:
        raise HTTPException(status_code=400, detail="Date parameter is required.")
    return analytics_service.get_day_detail_summary(db=db, user=current_user, target_date_str=target_str)
