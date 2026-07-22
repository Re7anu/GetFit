"""Pytest test suite for nutrition meal logging and exercise MET calculations."""

from datetime import date
from app.db.models.user_auth import UserAuth
from app.db.models.profile import UserProfile
from app.core.security import get_password_hash, create_access_token


def create_test_user(db_session, email="nutritionuser@getfit.com") -> UserAuth:
    """Helper fixture creating a test user with a physical profile."""
    user = UserAuth(
        email=email,
        password_hash=get_password_hash("password123"),
    )
    db_session.add(user)
    db_session.flush()

    today = date.today()
    birth_date = date(today.year - 28, today.month, today.day)
    profile = UserProfile(
        user_id=user.id,
        name="Nutrition Tester",
        sex="male",
        birth_date=birth_date,
        height_cm=180.0,
        weight_kg=80.0,
        activity_level="moderately_active",
        goal_type="maintain",
        calculated_calorie_target=2500,
        calculated_protein_target_g=125.0,
        calculated_carb_target_g=312.5,
        calculated_fat_target_g=83.3,
    )
    db_session.add(profile)
    db_session.commit()
    db_session.refresh(user)
    return user


def test_food_logging_and_summary(client, db_session):
    """Tests logging meals and calculating daily nutrition consumed vs target budget."""
    user = create_test_user(db_session, email="food@getfit.com")
    access_token = create_access_token(user.id)
    headers = {"Authorization": f"Bearer {access_token}"}

    # 1. Log a breakfast meal
    meal_payload = {
        "meal_type": "breakfast",
        "description": "Oatmeal with protein powder and berries",
        "calories": 450,
        "protein_g": 35.0,
        "carbs_g": 55.0,
        "fat_g": 8.0,
        "quantity_g": 300.0,
    }
    res_meal = client.post("/api/v1/nutrition/meals", json=meal_payload, headers=headers)
    assert res_meal.status_code == 201, res_meal.text
    meal_data = res_meal.json()
    assert meal_data["description"] == "Oatmeal with protein powder and berries"
    assert meal_data["calories"] == 450

    # 2. Get today's meals list
    res_today = client.get("/api/v1/nutrition/meals/today", headers=headers)
    assert res_today.status_code == 200
    today_meals = res_today.json()
    assert len(today_meals) == 1

    # 3. Check daily summary calculations
    res_summary = client.get("/api/v1/nutrition/summary/today", headers=headers)
    assert res_summary.status_code == 200
    summary = res_summary.json()
    assert summary["calorie_target"] == 2500
    assert summary["calories_consumed"] == 450
    assert summary["calories_remaining"] == 2050
    assert summary["protein_consumed_g"] == 35.0


def test_exercise_logging_and_met_formula(client, db_session):
    """Tests logging a workout and calculating calories burned using MET formula (MET * weight * hours)."""
    user = create_test_user(db_session, email="runner@getfit.com")  # Weight: 80kg
    access_token = create_access_token(user.id)
    headers = {"Authorization": f"Bearer {access_token}"}

    # Running at 6 mph has a MET value of 9.8
    # Duration: 30 mins (0.5 hrs)
    # Expected Burn = 9.8 * 80 * 0.5 = 392 kcal
    workout_payload = {
        "exercise_name": "Outdoor Running (6 mph)",
        "duration_minutes": 30.0,
        "met_value": 9.8,
        "notes": "Morning park run",
    }
    res_log = client.post("/api/v1/exercises/logs", json=workout_payload, headers=headers)
    assert res_log.status_code == 201, res_log.text
    workout_data = res_log.json()
    assert workout_data["calories_burned"] == 392

    # Verify today's exercise summary
    res_summary = client.get("/api/v1/exercises/summary/today", headers=headers)
    assert res_summary.status_code == 200
    summary = res_summary.json()
    assert summary["total_workouts"] == 1
    assert summary["total_duration_minutes"] == 30.0
    assert summary["total_calories_burned"] == 392
