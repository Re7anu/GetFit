"""Pytest test suite for nutrition math, authentication endpoints, and user profile management."""

from datetime import date
from app.core.formulas import calculate_age, calculate_targets


def test_calculate_age():
    """Tests age calculation from a birth date."""
    birth = date(1995, 7, 21)
    age = calculate_age(birth)
    assert age == 31


def test_calculate_targets_maintenance():
    """Tests Mifflin-St Jeor daily calorie and macronutrient target calculation math."""
    today = date.today()
    birth_date = date(today.year - 30, today.month, today.day)

    calorie_target, carbs_g, protein_g, fat_g = calculate_targets(
        weight_kg=80.0,
        height_cm=180.0,
        birth_date=birth_date,
        sex="male",
        activity_level="moderately_active",
        goal_type="maintain",
    )

    # Assert targets are generated
    assert calorie_target > 1500
    assert carbs_g > 0
    assert protein_g > 0
    assert fat_g > 0

    # Maintenance split: 50% Carbs, 20% Protein, 30% Fat
    total_kcal_computed = (carbs_g * 4) + (protein_g * 4) + (fat_g * 9)
    assert abs(total_kcal_computed - calorie_target) < 10


def test_register_and_login_flow(client):
    """Tests full API integration flow: user registration, duplicate prevention, JWT login, profile fetching, and profile metric updates."""
    today = date.today()
    birth_str = (date(today.year - 25, today.month, today.day)).isoformat()

    register_payload = {
        "email": "testuser@getfit.com",
        "password": "securepassword123",
        "profile": {
            "name": "Test User",
            "sex": "female",
            "birth_date": birth_str,
            "height_cm": 165.0,
            "weight_kg": 60.0,
            "activity_level": "sedentary",
            "goal_type": "lose_weight",
            "target_weight_kg": 55.0,
        },
    }

    # Test Register
    response = client.post("/api/v1/auth/register", json=register_payload)
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["email"] == "testuser@getfit.com"
    assert data["profile"]["calculated_calorie_target"] > 1000
    # Lose weight split: 40% carbs, 30% protein, 30% fat
    assert data["profile"]["calculated_protein_target_g"] > 0

    # Test Register Duplicate fails
    response_dup = client.post("/api/v1/auth/register", json=register_payload)
    assert response_dup.status_code == 400

    # Test Login
    login_payload = {
        "email": "testuser@getfit.com",
        "password": "securepassword123",
    }
    response_login = client.post("/api/v1/auth/login", json=login_payload)
    assert response_login.status_code == 200
    tokens = response_login.json()
    assert "access_token" in tokens
    assert "refresh_token" in tokens

    access_token = tokens["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    # Test Get Profile Me
    response_me = client.get("/api/v1/users/me", headers=headers)
    assert response_me.status_code == 200
    me_data = response_me.json()
    assert me_data["profile"]["name"] == "Test User"
    original_target = me_data["profile"]["calculated_calorie_target"]

    # Test Update Profile (e.g. increase weight, target calories should increase)
    update_payload = {
        "weight_kg": 75.0,  # +15kg
        "activity_level": "very_active",
    }
    response_update = client.put("/api/v1/users/me", json=update_payload, headers=headers)
    assert response_update.status_code == 200
    updated_data = response_update.json()
    assert updated_data["profile"]["weight_kg"] == 75.0
    assert updated_data["profile"]["calculated_calorie_target"] > original_target

