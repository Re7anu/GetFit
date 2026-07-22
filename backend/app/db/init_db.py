"""Database table initialization bootstrap script module."""

from app.core.database import engine
from app.models.base import Base
# Import all models to ensure they are registered on Base metadata
from app.models.profile import UserProfile
from app.models.token import RefreshToken
from app.models.user import User


def init_db() -> None:
    """Initializes and creates all registered SQLAlchemy database tables."""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")


if __name__ == "__main__":
    init_db()

