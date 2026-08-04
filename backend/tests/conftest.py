"""Pytest fixtures configuration module for database and API client mocking."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config.settings import settings
from app.db.models.base import Base
from app.db.session import get_db
from app.main import app

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


from app.db.init_db import init_db


@pytest.fixture(scope="function", autouse=True)
def init_test_db():
    """Autouse fixture ensuring tables and schema columns are initialized for testing."""
    init_db()
    yield


@pytest.fixture(scope="function")
def db_session():
    """Fixture providing an isolated transactional SQLAlchemy database session with automatic rollback."""
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
