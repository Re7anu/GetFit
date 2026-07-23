"""Pytest fixtures configuration module for database and API client mocking."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.models.base import Base
from app.db.session import get_db
from app.main import app

# Use local file-based SQLite database for tests to ensure smooth isolation
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function", autouse=True)
def init_test_db():
    """Autouse fixture that initializes and drops test database tables before/after each test."""
    # Setup test tables
    Base.metadata.create_all(bind=engine)
    yield
    # Tear down test tables
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session():
    """Fixture providing an isolated transactional SQLAlchemy database session."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def client(db_session):
    """Fixture providing a FastAPI TestClient configured with isolated database dependency overrides."""

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()

