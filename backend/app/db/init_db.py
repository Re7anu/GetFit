"""Database table initialization bootstrap script module."""

from app.db.session import engine
from app.db.models.base import Base
from app.db.models.workout_log import WorkoutLog
from app.db.models.nutrition_log import FoodLog
from app.db.models.profile import UserProfile
from app.db.models.token import RefreshToken
from app.db.models.user_auth import UserAuth


def init_db() -> None:
    """Initializes and creates all registered SQLAlchemy database tables."""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    
    # Auto-add missing columns to existing user_profiles table if needed
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS fitness_focus VARCHAR DEFAULT 'athletic';"))
            conn.execute(text("ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS weekly_schedule_json TEXT;"))
            conn.commit()
    except Exception as e:
        print(f"[Schema Migration Info]: {e}")

    print("Database tables created successfully!")


if __name__ == "__main__":
    init_db()

