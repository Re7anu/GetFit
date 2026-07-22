from app.core.database import engine
from app.models.base import Base
# Import all models to ensure they are registered on Base metadata
from app.models.user import User
from app.models.profile import UserProfile
from app.models.token import RefreshToken

def init_db():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")

if __name__ == "__main__":
    init_db()
