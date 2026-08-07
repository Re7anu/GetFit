"""Database table initialization bootstrap script module."""

from app.db.session import engine
from app.db.models.base import Base
from app.db.models.workout_log import WorkoutLog
from app.db.models.nutrition_log import FoodLog
from app.db.models.profile import UserProfile
from app.db.models.exercise_catalog import ExerciseCatalogItem
from app.db.models.fitbot import FitBotSession, FitBotChatMessage
from app.services.exercise_catalog_service import seed_exercise_catalog
from app.db.session import SessionLocal


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
            conn.execute(text("ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS enable_daily_email_report BOOLEAN DEFAULT TRUE;"))
            conn.execute(text("ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS preferred_email_time VARCHAR DEFAULT '21:00';"))
            conn.execute(text("ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS day_cutoff_time VARCHAR DEFAULT '00:00';"))
            conn.commit()
    except Exception as e:
        print(f"[Schema Migration Info]: {e}")

    try:
        db = SessionLocal()
        seed_exercise_catalog(db)
        db.close()
    except Exception as e:
        print(f"[Exercise Catalog Seed Info]: {e}")

    print("Database tables created successfully!")


if __name__ == "__main__":
    init_db()

