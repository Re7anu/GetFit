"""Pytest test suite for physical profile onboarding, target calculations, and dynamic caloric pace."""

from datetime import date
from app.core.auth_security import create_access_token, get_password_hash
from app.core.formulas import calculate_age, calculate_profile_targets
from app.db.models.user_auth import UserAuth


def create_test_user(db_session, email="profileuser@getfit.com") -> UserAuth:
    """Helper fixture creating a test user entity in the database."""
    user = UserAuth(
        email=email,
        password_hash=get_password_hash("SecurePassword123!"),
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def test_age_calculation():
    """Tests age calculation logic from a birth date."""
    birth = date(1995, 7, 21)
    age = calculate_age(birth)
    assert age == 31


def test_dynamic_caloric_pace_weight_loss():
    """Tests dynamic caloric pace calculation for 5 kg weight loss in 10 weeks (expect ~-550 kcal/day)."""
    today = date.today()
    birth_date = date(today.year - 30, today.month, today.day)

    # 80 kg -> 75 kg (-5 kg) in 10 weeks (70 days)
    # Total deficit = -5 * 7700 = -38,500 kcal
    # Daily pace = -38500 / 70 = -550 kcal/day
    targets = calculate_profile_targets(
        weight_kg=80.0,
        height_cm=180.0,
        birth_date=birth_date,
        gender="male",
        activity_level="moderately_active",
        target_weight_kg=75.0,
        timeline_weeks=10,
    )

    assert targets["goal_type"] == "lose_weight"
    assert targets["caloric_pace_kcal_per_day"] == -550.0
    assert targets["calculated_calorie_target"] == int(targets["tdee"] - 550)
    assert targets["is_safe_pace"] is True


def test_unrealistic_timeline_health_guardrail():
    """Tests health guardrails when user sets an aggressive timeline (>1.0% body weight loss per week)."""
    today = date.today()
    birth_date = date(today.year - 30, today.month, today.day)

    # 100 kg -> 80 kg (-20 kg) in 2 weeks (unrealistic pace)
    targets = calculate_profile_targets(
        weight_kg=100.0,
        height_cm=180.0,
        birth_date=birth_date,
        gender="male",
        activity_level="sedentary",
        target_weight_kg=80.0,
        timeline_weeks=2,
    )

    assert targets["is_safe_pace"] is False
    # Max safe weekly loss = 1% of 100kg = 1.0 kg/week -> 20kg requires min 20 weeks
    assert targets["suggested_min_weeks"] >= 20


def test_profile_api_endpoints_flow(client, db_session):
    """Tests full profile onboarding, GET /profiles/me, and PUT /profiles/me update flow."""
    user = create_test_user(db_session, email="profileapi@getfit.com")
    access_token = create_access_token(user.id)
    headers = {"Authorization": f"Bearer {access_token}"}

    today = date.today()
    birth_str = (date(today.year - 28, today.month, today.day)).isoformat()

    onboard_payload = {
        "name": "Alex Profile",
        "gender": "male",
        "birth_date": birth_str,
        "height_cm": 178.0,
        "weight_kg": 80.0,
        "target_weight_kg": 75.0,
        "timeline_weeks": 10,
        "activity_level": "moderately_active",
    }

    # 1. Onboard profile (POST /api/v1/profiles)
    res_onboard = client.post("/api/v1/profiles", json=onboard_payload, headers=headers)
    assert res_onboard.status_code == 201, res_onboard.text
    p_data = res_onboard.json()
    assert p_data["name"] == "Alex Profile"
    assert p_data["bmr"] > 1500
    assert p_data["tdee"] > p_data["bmr"]
    assert p_data["caloric_pace_kcal_per_day"] == -550.0

    # 2. Get Profile (GET /api/v1/profiles/me)
    res_get = client.get("/api/v1/profiles/me", headers=headers)
    assert res_get.status_code == 200
    get_data = res_get.json()
    assert get_data["user_id"] == user.id

    # 3. Update Profile (PUT /api/v1/profiles/me) - change activity level & timeline
    update_payload = {
        "activity_level": "very_active",
        "timeline_weeks": 12,
    }
    res_update = client.put("/api/v1/profiles/me", json=update_payload, headers=headers)
    assert res_update.status_code == 200
    updated_data = res_update.json()
    assert updated_data["activity_level"] == "very_active"
    assert updated_data["tdee"] > p_data["tdee"]
