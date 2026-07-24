"""FastAPI main application entrypoint and router mounting module."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.api import auth, exercises, nutrition, profiles, users
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
app.include_router(exercises.router, prefix=f"{settings.API_V1_STR}/exercises", tags=["exercises"])


@app.get("/")
def read_root():
    """Root welcome endpoint for API status check.

    Returns:
        Welcome message JSON response.
    """
    return {"message": "Welcome to GetFit User Authentication API. Go to /docs for Swagger API documentation."}



