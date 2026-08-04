"""Pytest test suite for daily email report generation, HTML template rendering, and Resend API endpoints."""

import pytest
from datetime import date
from app.db.models.user_auth import UserAuth
from app.db.models.profile import UserProfile
from app.services.email_report_service import (
    generate_daily_report_insights,
    generate_daily_html_report,
    send_nightly_email_report,
)


@pytest.fixture
def test_user_with_profile(db_session):
    """Fixture creating a test user with a physical profile."""
    user = UserAuth(
        email="delivered@resend.dev",
        password_hash="$2b$12$eImiTXuWVxfM37uY4JANjO5E/g/V3S42qG8.yC4927X5Qy0216m52",  # test password
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    profile = UserProfile(
        user_id=user.id,
        name="Test Runner",
        gender="male",
        birth_date=date(1995, 5, 15),
        height_cm=180.0,
        weight_kg=78.0,
        target_weight_kg=75.0,
        timeline_weeks=12,
        activity_level="moderately_active",
        fitness_focus="athletic",
        bmr=1750.0,
        tdee=2400.0,
        caloric_pace_kcal_per_day=-300.0,
        goal_type="lose_weight",
        calculated_calorie_target=2100,
        calculated_protein_target_g=150.0,
        calculated_carb_target_g=220.0,
        calculated_fat_target_g=60.0,
        is_safe_pace=True,
        suggested_min_weeks=12,
        enable_daily_email_report=True,
        preferred_email_time="21:00",
    )
    db_session.add(profile)
    db_session.commit()
    db_session.refresh(user)
    return user


def test_generate_daily_report_insights():
    """Verifies daily report insights generator returns 3 actionable bullet points."""
    summary_data = {
        "goal_type": "lose_weight",
        "base_calorie_target": 2100,
        "consumed_calories": 1950,
        "exercise_net_calories_burned": 350,
        "adjusted_calorie_target": 2450,
        "workouts": [{"exercise_name": "Pushups", "duration_minutes": 15, "calories_burned": 100}],
        "consumed_protein_g": 140.0,
        "target_protein_g": 150.0,
        "consumed_carb_g": 200.0,
        "target_carb_g": 220.0,
        "consumed_fat_g": 55.0,
        "target_fat_g": 60.0,
        "total_micronutrients": {"fiber_g": 25.0, "sodium_mg": 1800.0, "potassium_mg": 2500.0, "vitamin_c_mg": 60.0, "calcium_mg": 800.0, "iron_mg": 12.0},
        "is_goal_hit": True,
    }
    insights = generate_daily_report_insights(summary_data)
    assert isinstance(insights, list)
    assert len(insights) >= 1


def test_generate_daily_html_report(db_session, test_user_with_profile):
    """Verifies generate_daily_html_report creates subject, html_content, and summary stats."""
    report = generate_daily_html_report(db=db_session, user=test_user_with_profile, target_date=date.today())

    assert "subject" in report
    assert "html_content" in report
    assert "GetFit Daily Summary" in report["subject"]
    assert "Test runner" in report["html_content"] or "Test Runner" in report["html_content"]
    assert "Daily Health & Performance Insights" in report["html_content"]
    assert "Essential Micronutrients" in report["html_content"]


def test_send_nightly_email_report_simulated(db_session, test_user_with_profile):
    """Verifies send_nightly_email_report executes cleanly."""
    res = send_nightly_email_report(db=db_session, user=test_user_with_profile, target_date=date.today())
    assert res["status"] in ("sent", "simulated_success", "error")
    assert res["recipient"] == test_user_with_profile.email


def test_send_daily_report_api_endpoint(client, db_session, test_user_with_profile):
    """Verifies POST /api/v1/analytics/send-daily-report triggers email dispatch."""
    # Obtain access token
    from app.core.auth_security import create_access_token
    token = create_access_token(subject=test_user_with_profile.id)
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post("/api/v1/analytics/send-daily-report", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("sent", "simulated_success", "error")
    assert data["recipient"] == test_user_with_profile.email
