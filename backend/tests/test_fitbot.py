"""Pytest test suite for FitBot AI Coach Chatbot API endpoints and session management."""

import pytest
from datetime import date
from app.db.models.user_auth import UserAuth
from app.db.models.profile import UserProfile


@pytest.fixture
def fitbot_user(db_session):
    """Fixture creating a test user with profile for FitBot testing."""
    user = UserAuth(
        email="fitbot_runner@getfit.com",
        password_hash="$2b$12$eImiTXuWVxfM37uY4JANjO5E/g/V3S42qG8.yC4927X5Qy0216m52",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    profile = UserProfile(
        user_id=user.id,
        name="FitBot Tester",
        gender="female",
        birth_date=date(1996, 8, 20),
        height_cm=168.0,
        weight_kg=62.0,
        target_weight_kg=58.0,
        timeline_weeks=10,
        activity_level="moderately_active",
        fitness_focus="athletic",
        bmr=1450.0,
        tdee=2000.0,
        caloric_pace_kcal_per_day=-300.0,
        goal_type="lose_weight",
        calculated_calorie_target=1700,
        calculated_protein_target_g=110.0,
        calculated_carb_target_g=180.0,
        calculated_fat_target_g=50.0,
        is_safe_pace=True,
        suggested_min_weeks=10,
    )
    db_session.add(profile)
    db_session.commit()
    db_session.refresh(user)
    return user


def get_auth_headers(user_id: str) -> dict:
    """Helper to generate JWT bearer authorization headers."""
    from app.core.auth_security import create_access_token
    token = create_access_token(subject=user_id)
    return {"Authorization": f"Bearer {token}"}


def test_create_and_list_fitbot_sessions(client, db_session, fitbot_user):
    """Verifies creating a chat session and retrieving session list."""
    headers = get_auth_headers(fitbot_user.id)

    # 1. Create session
    create_res = client.post("/api/v1/fitbot/sessions?title=Leg%20Day%20Coach", headers=headers)
    assert create_res.status_code == 201
    session_data = create_res.json()
    assert session_data["title"] == "Leg Day Coach"
    session_id = session_data["id"]

    # 2. List sessions
    list_res = client.get("/api/v1/fitbot/sessions", headers=headers)
    assert list_res.status_code == 200
    sessions_list = list_res.json()["sessions"]
    assert len(sessions_list) >= 1
    assert any(s["id"] == session_id for s in sessions_list)


def test_send_fitbot_chat_message(client, db_session, fitbot_user):
    """Verifies sending prompt to FitBot and receiving structured response + quick replies."""
    headers = get_auth_headers(fitbot_user.id)

    payload = {"message": "How much protein should I eat for dinner?"}
    response = client.post("/api/v1/fitbot/chat", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()

    assert "session_id" in data
    assert "reply" in data
    assert isinstance(data["suggested_quick_replies"], list)
    assert len(data["suggested_quick_replies"]) >= 1

    session_id = data["session_id"]

    # Retrieve messages for this session
    msg_res = client.get(f"/api/v1/fitbot/sessions/{session_id}/messages", headers=headers)
    assert msg_res.status_code == 200
    messages = msg_res.json()
    assert len(messages) >= 2  # 1 user + 1 assistant
    assert messages[0]["role"] == "user"
    assert messages[1]["role"] == "assistant"


def test_delete_fitbot_session(client, db_session, fitbot_user):
    """Verifies deleting a chat session."""
    headers = get_auth_headers(fitbot_user.id)

    # Create session
    create_res = client.post("/api/v1/fitbot/sessions?title=Temp%20Session", headers=headers)
    session_id = create_res.json()["id"]

    # Delete session
    del_res = client.delete(f"/api/v1/fitbot/sessions/{session_id}", headers=headers)
    assert del_res.status_code == 204

    # Verify 404 on get messages
    msg_res = client.get(f"/api/v1/fitbot/sessions/{session_id}/messages", headers=headers)
    assert msg_res.status_code == 404
