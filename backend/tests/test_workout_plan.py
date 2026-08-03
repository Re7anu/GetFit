"""Integration tests for Weekly Routine Blueprint & Fitness Focus API Endpoints."""

import pytest
from fastapi.testclient import TestClient


def test_workout_plan_endpoints(client: TestClient):
    # Register & Login User
    email = "plan_test_user@example.com"
    pwd = "TestPassword123!"
    client.post("/api/v1/auth/register", json={"email": email, "password": pwd})
    login_res = client.post("/api/v1/auth/login", json={"email": email, "password": pwd})
    token = login_res.json()["access_token"]
    auth_headers = {"Authorization": f"Bearer {token}"}

    # Create profile
    profile_payload = {
        "name": "Planner Test",
        "gender": "male",
        "birth_date": "1998-05-15",
        "height_cm": 175.0,
        "weight_kg": 57.0,
        "target_weight_kg": 62.0,
        "timeline_weeks": 12,
        "activity_level": "lightly_active",
        "fitness_focus": "athletic",
    }
    client.post("/api/v1/profiles", json=profile_payload, headers=auth_headers)
    resp = client.get("/api/v1/workouts/plan", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "fitness_focus" in data
    assert len(data["weekly_schedule"]) == 7

    # 2. Update plan to Bodybuilding with custom targets
    payload = {
        "fitness_focus": "bodybuilding",
        "schedule": [
            {"day": "monday", "activity_type": "gym", "targets": ["chest", "triceps", "shoulders"], "is_completed": False},
            {"day": "tuesday", "activity_type": "gym", "targets": ["back", "biceps"], "is_completed": False},
            {"day": "wednesday", "activity_type": "sports", "targets": ["football", "cricket"], "is_completed": False},
            {"day": "thursday", "activity_type": "cardio", "targets": ["walking"], "is_completed": False},
            {"day": "friday", "activity_type": "gym", "targets": ["quads", "hamstrings", "glutes", "abs"], "is_completed": False},
            {"day": "saturday", "activity_type": "rest", "targets": [], "is_completed": False},
            {"day": "sunday", "activity_type": "rest", "targets": [], "is_completed": False},
        ]
    }
    update_resp = client.post("/api/v1/workouts/plan", json=payload, headers=auth_headers)
    assert update_resp.status_code == 200
    updated_data = update_resp.json()
    assert updated_data["fitness_focus"] == "bodybuilding"
    assert updated_data["max_protein_cap_g_per_kg"] == 2.5

    # 3. Toggle Monday completion
    toggle_resp = client.post("/api/v1/workouts/plan/toggle-day?day=monday", headers=auth_headers)
    assert toggle_resp.status_code == 200
    toggled_data = toggle_resp.json()
    monday_item = next(item for item in toggled_data["weekly_schedule"] if item["day"] == "monday")
    assert monday_item["is_completed"] is True
