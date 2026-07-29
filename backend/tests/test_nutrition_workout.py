"""Pytest test suite for meal logging, daily nutrition budget tracking, and Net MET workout calorie calculation."""

from datetime import date
from app.core.auth_security import create_access_token, get_password_hash
from app.core.formulas import calculate_net_exercise_calories
from app.db.models.profile import UserProfile
from app.db.models.user_auth import UserAuth


def create_user_with_profile(db_session, email="logginguser@getfit.com") -> UserAuth:
    """Helper fixture creating a test user with onboarded physical profile."""
    user = UserAuth(
        email=email,
        password_hash=get_password_hash("SecurePassword123!"),
    )
    db_session.add(user)
    db_session.flush()

    today = date.today()
    birth_date = date(today.year - 25, today.month, today.day)

    profile = UserProfile(
        user_id=user.id,
        name="Logging User",
        gender="male",
        birth_date=birth_date,
        height_cm=180.0,
        weight_kg=80.0,
        target_weight_kg=75.0,
        timeline_weeks=10,
        activity_level="sedentary",  # Multiplier 1.2
        bmr=1800.0,
        tdee=2160.0,
        caloric_pace_kcal_per_day=-550.0,
        goal_type="lose_weight",
        calculated_calorie_target=1610,  # 2160 - 550
        calculated_protein_target_g=120.8,
        calculated_carb_target_g=161.0,
        calculated_fat_target_g=53.7,
        is_safe_pace=True,
        suggested_min_weeks=10,
    )
    db_session.add(profile)
    db_session.commit()
    db_session.refresh(user)
    return user


def test_net_met_exercise_burn_calculation():
    """Tests Solution A (Net MET) exercise burn formula accuracy.

    Weight = 80kg, Activity = sedentary (1.2), Running MET = 8.0, Duration = 60 mins.
    Net MET = 8.0 - 1.2 = 6.8
    Expected burn = 6.8 * 80 * 1 = 544 kcal
    """
    burn = calculate_net_exercise_calories(
        met=8.0,
        weight_kg=80.0,
        duration_minutes=60.0,
        activity_level="sedentary",
    )
    assert burn == 544


def test_meal_logging_and_today_summary(client, db_session):
    """Tests logging meals via POST /nutrition/meals and getting daily summary via GET /nutrition/summary/today."""
    user = create_user_with_profile(db_session, email="mealuser@getfit.com")
    access_token = create_access_token(user.id)
    headers = {"Authorization": f"Bearer {access_token}"}

    # 1. Log Breakfast
    breakfast_payload = {
        "meal_type": "breakfast",
        "description": "Oatmeal with Almond Milk and Banana",
        "calories": 400,
        "protein_g": 12.0,
        "carbs_g": 65.0,
        "fat_g": 8.0,
    }
    res_b = client.post("/api/v1/nutrition/meals", json=breakfast_payload, headers=headers)
    assert res_b.status_code == 201
    assert res_b.json()["calories"] == 400

    # 2. Log Lunch
    lunch_payload = {
        "meal_type": "lunch",
        "description": "Grilled Chicken Breast with Rice and Veggies",
        "calories": 650,
        "protein_g": 55.0,
        "carbs_g": 70.0,
        "fat_g": 15.0,
    }
    res_l = client.post("/api/v1/nutrition/meals", json=lunch_payload, headers=headers)
    assert res_l.status_code == 201

    # 3. Get Today's Logged Meals
    res_meals = client.get("/api/v1/nutrition/meals/today", headers=headers)
    assert res_meals.status_code == 200
    assert len(res_meals.json()) == 2

    # 4. Get Today's Summary
    res_summary = client.get("/api/v1/nutrition/summary/today", headers=headers)
    assert res_summary.status_code == 200
    s_data = res_summary.json()
    assert s_data["consumed_calories"] == 1050  # 400 + 650
    assert s_data["consumed_protein_g"] == 67.0
    assert s_data["base_calorie_target"] == 1610
    assert s_data["remaining_calories"] == 1610 - 1050


def test_workout_logging_and_adjusted_budget(client, db_session):
    """Tests logging workout via POST /workouts/logs and verifying adjusted daily calorie target."""
    user = create_user_with_profile(db_session, email="exerciseuser@getfit.com")
    access_token = create_access_token(user.id)
    headers = {"Authorization": f"Bearer {access_token}"}

    # 1. Log Running Workout (MET 8.0, 60 mins -> Net burn 544 kcal)
    workout_payload = {
        "exercise_name": "Outdoor Running",
        "duration_minutes": 60.0,
        "met_value": 8.0,
        "notes": "Evening 10k run",
    }
    res_w = client.post("/api/v1/workouts/logs", json=workout_payload, headers=headers)
    assert res_w.status_code == 201
    assert res_w.json()["calories_burned"] == 544

    # 2. Get Today's Workouts Summary
    res_ex_summary = client.get("/api/v1/workouts/summary/today", headers=headers)
    assert res_ex_summary.status_code == 200
    ex_data = res_ex_summary.json()
    assert ex_data["total_workouts"] == 1
    assert ex_data["total_net_calories_burned"] == 544

    # 3. Verify Nutrition Summary Adjusted Target (Base 1610 + Burn 544 = 2154 kcal)
    res_summary = client.get("/api/v1/nutrition/summary/today", headers=headers)
    assert res_summary.status_code == 200
    s_data = res_summary.json()
    assert s_data["exercise_net_calories_burned"] == 544
    assert s_data["adjusted_calorie_target"] == 1610 + 544


def test_ai_food_and_workout_logging_flow(client, db_session, monkeypatch):
    """Tests POST /nutrition/meals/ai-parse and POST /workouts/logs/ai-parse using Gemini AI response_schema mocks."""
    from app.schemas.workout_log import AIWorkoutParseResult
    from app.schemas.food_log import AIFoodParseResult

    user = create_user_with_profile(db_session, email="aiuser@getfit.com")
    access_token = create_access_token(user.id)
    headers = {"Authorization": f"Bearer {access_token}"}

    # 1. Mock Gemini food structured output
    def mock_food_gemini(prompt, response_schema):
        return AIFoodParseResult(
            meal_type="breakfast",
            description="2 boiled eggs and toast",
            calories=320,
            protein_g=16.0,
            carbs_g=25.0,
            fat_g=12.0,
            quantity_g=180.0,
        )

    monkeypatch.setattr("app.services.gemini_service.generate_structured_output", mock_food_gemini)

    res_food = client.post(
        "/api/v1/nutrition/meals/ai-parse",
        json={"text_prompt": "2 boiled eggs and toast"},
        headers=headers,
    )
    assert res_food.status_code == 201
    f_data = res_food.json()
    assert f_data["calories"] == 320
    assert f_data["input_method"] == "ai_nlp"

    # 2. Mock Gemini exercise structured output
    def mock_ex_gemini(prompt, response_schema):
        return AIWorkoutParseResult(
            exercise_name="Heavy Squats Workout",
            duration_minutes=45.0,
            met_value=6.0,
            notes="Leg day",
        )

    monkeypatch.setattr("app.services.gemini_service.generate_structured_output", mock_ex_gemini)

    res_ex = client.post(
        "/api/v1/workouts/logs/ai-parse",
        json={"text_prompt": "45 mins heavy squats"},
        headers=headers,
    )
    assert res_ex.status_code == 201
    ex_data = res_ex.json()
    assert ex_data["exercise_name"] == "Heavy Squats Workout"
    # Net MET = 6.0 - 1.2 = 4.8 * 80 * 0.75 = 288 kcal
    assert ex_data["calories_burned"] == 288


def test_exercise_catalog_and_structured_logging(client, db_session):
    """Tests GET /workouts/catalog and POST /workouts/logs/structured for rep-based and distance-based activities."""
    user = create_user_with_profile(db_session, email="cataloguser@getfit.com")
    access_token = create_access_token(user.id)
    headers = {"Authorization": f"Bearer {access_token}"}

    # 1. Fetch catalog
    res_cat = client.get("/api/v1/workouts/catalog")
    assert res_cat.status_code == 200
    catalog = res_cat.json()
    assert len(catalog) >= 20

    # 2. Log 3 sets x 20 reps Pushups (Total 60 reps)
    pushup_payload = {
        "exercise_id": "pushups",
        "sets": 3,
        "reps": 20,
    }
    res_p = client.post("/api/v1/workouts/logs/structured", json=pushup_payload, headers=headers)
    assert res_p.status_code == 201
    p_data = res_p.json()
    assert p_data["exercise_name"] == "Push-ups"
    assert "3 sets × 20 reps" in p_data["notes"]

    # 3. Log 10 km outdoor running
    run_payload = {
        "exercise_id": "running_outdoor",
        "distance_km": 10.0,
    }
    res_r = client.post("/api/v1/workouts/logs/structured", json=run_payload, headers=headers)
    assert res_r.status_code == 201
    r_data = res_r.json()
    assert r_data["exercise_name"] == "Outdoor Running"
    assert r_data["duration_minutes"] == 60.0  # 10 km at 10 km/h = 60 mins
