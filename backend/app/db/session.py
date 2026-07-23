"""Database engine configuration and session dependency manager module."""

from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from app.config.settings import settings

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
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
