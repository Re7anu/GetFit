from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db

router = APIRouter()

@router.get("/health")
async def health_check():
    return {"status": "ok", "router": "nutrition"}
