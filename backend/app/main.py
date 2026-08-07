"""FastAPI main application entrypoint and router mounting module."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.api import analytics, auth, fitbot, nutrition, profiles, users, workouts
from app.config.settings import settings
from app.core.scheduler import start_scheduler, stop_scheduler


from app.core.logging_config import setup_logging
from app.db.init_db import init_db
from loguru import logger

# Initialize Loguru logging sinks
setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager that handles application startup and shutdown events."""
    logger.info("Starting GetFit API application...")
    try:
        init_db()
        logger.info("Database tables initialized successfully")
    except Exception as e:
        logger.error("Database initialization failed: {}", e)
    
    try:
        start_scheduler()
        logger.info("Nightly report scheduler started successfully")
    except Exception as e:
        logger.error("Scheduler startup failed: {}", e)
        
    yield
    
    logger.info("Shutting down GetFit API application...")
    try:
        stop_scheduler()
        logger.info("Nightly report scheduler stopped successfully")
    except Exception as e:
        logger.error("Scheduler shutdown failed: {}", e)


app = FastAPI(title=settings.PROJECT_NAME, version="1.0.0", lifespan=lifespan)

from fastapi import Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError

@app.exception_handler(OperationalError)
async def db_operational_exception_handler(request: Request, exc: OperationalError):
    return JSONResponse(
        status_code=503,
        content={"detail": "Database service unavailable. Please check that PostgreSQL container/service is active."},
    )

# Mount API Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
app.include_router(profiles.router, prefix=f"{settings.API_V1_STR}/profiles", tags=["profiles"])
app.include_router(nutrition.router, prefix=f"{settings.API_V1_STR}/nutrition", tags=["nutrition"])
app.include_router(workouts.router, prefix=f"{settings.API_V1_STR}/workouts", tags=["workouts"])
app.include_router(analytics.router, prefix=f"{settings.API_V1_STR}/analytics", tags=["analytics"])
app.include_router(fitbot.router, prefix=f"{settings.API_V1_STR}/fitbot", tags=["fitbot"])


import os
from fastapi.staticfiles import StaticFiles

# Mount Frontend Web Application
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend"))
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

