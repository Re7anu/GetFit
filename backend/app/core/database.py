"""Database engine configuration and session dependency manager module."""

from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from app.core.settings import settings

try:
    engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
    # Verify connection
    with engine.connect() as conn:
        pass
except Exception:
    # Fallback to SQLite for zero-config local testing if PostgreSQL is unavailable
    engine = create_engine("sqlite:///./getfit.db", connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """Dependency generator that provides a transactional database session per request.

    Yields:
        Session: SQLAlchemy Database Session instance.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

