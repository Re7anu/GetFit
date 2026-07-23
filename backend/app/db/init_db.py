"""Database table initialization bootstrap script module."""

from app.db.session import engine
from app.db.models.base import Base
from app.db.models.token import RefreshToken
from app.db.models.user_auth import UserAuth


def init_db() -> None:
    """Initializes and creates all registered SQLAlchemy database tables."""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")


if __name__ == "__main__":
    init_db()

