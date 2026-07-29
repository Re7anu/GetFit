"""FastAPI main application entrypoint and router mounting module."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.api import analytics, auth, workouts, nutrition, profiles, users
from app.config.settings import settings
from app.db.init_db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager that handles application startup and shutdown events."""
    # Automatically initialize tables on start for ease of local development
    try:
        init_db()
    except Exception as e:
        print(f"Database initialization failed: {e}")
    yield


app = FastAPI(title=settings.PROJECT_NAME, version="1.0.0", lifespan=lifespan)

# Mount API Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
app.include_router(profiles.router, prefix=f"{settings.API_V1_STR}/profiles", tags=["profiles"])
app.include_router(nutrition.router, prefix=f"{settings.API_V1_STR}/nutrition", tags=["nutrition"])
app.include_router(workouts.router, prefix=f"{settings.API_V1_STR}/workouts", tags=["workouts"])
app.include_router(analytics.router, prefix=f"{settings.API_V1_STR}/analytics", tags=["analytics"])


import os
from fastapi.staticfiles import StaticFiles

# Mount Frontend Web Application
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend"))
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

