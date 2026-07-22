from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.core.settings import settings
from app.api import auth, users
from app.db.init_db import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Automatically initialize tables on start for ease of local development
    try:
        init_db()
    except Exception as e:
        print(f"Database initialization failed: {e}")
    yield

app = FastAPI(title=settings.PROJECT_NAME, version="1.0.0", lifespan=lifespan)

app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])

@app.get("/")
def read_root():
    return {"message": "Welcome to GetFit API. Go to /docs for Swagger API documentation."}
