"""Service module for generating and dispatching automated nightly health & nutrition HTML email reports with Gemini AI insights and Resend integration."""

from datetime import date, datetime, time
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from loguru import logger

from app.config.settings import settings
from app.core.prompts import DAILY_REPORT_INSIGHTS_PROMPT_TEMPLATE
from app.db.models.user_auth import UserAuth
from app.services import analytics_service
from app.services.ai_service import generate_structured_output

# Try importing resend SDK dynamically
try:
    import resend
except ImportError:
    resend = None


class DailyInsightsSchema(BaseModel):
    """Pydantic schema for Gemini AI daily report insights structured output."""

    insights: List[str] = Field(
        ...,
        min_length=1,
        max_length=3,
        description="3 short, highly personalized, actionable, and encouraging health/nutrition/workout bullet points for today.",
    )


def generate_daily_report_insights(summary_data: Any) -> List[str]:
    """Generates 3 personalized daily health insights using Gemini AI.

    Args:
        summary_data: Dictionary or DayDetailResponse containing today's nutrition, workout, and goal metrics.

    Returns:
        List of 3 short insight string bullet points.
    """
    data = summary_data.model_dump() if hasattr(summary_data, "model_dump") else (summary_data if isinstance(summary_data, dict) else dict(summary_data))

    if not settings.LLM_API_KEY:
        return [
            "Great effort tracking your daily nutrition and physical activities today!",
            "Consistent tracking is the #1 predictor of long-term metabolic health.",
            "Make sure to get 7-8 hours of quality sleep to support recovery.",
        ]

    workouts_list = data.get('workouts', [])
    workout_summary_str = ", ".join([f"{w.get('exercise_name')} ({w.get('duration_minutes')}m, {w.get('calories_burned')} kcal)" for w in workouts_list]) if workouts_list else "None logged today"

    micros = data.get('total_micronutrients', {}) or {}
    micros_str = f"Fiber: {micros.get('fiber_g', 0)}g, Sodium: {micros.get('sodium_mg', 0)}mg, Potassium: {micros.get('potassium_mg', 0)}mg, Vitamin C: {micros.get('vitamin_c_mg', 0)}mg, Calcium: {micros.get('calcium_mg', 0)}mg, Iron: {micros.get('iron_mg', 0)}mg"

    meals_list = data.get('meals', [])
    meal_names_str = ", ".join([m.get('description', '') for m in meals_list if m.get('description')]) or "No meals logged"

    prompt = DAILY_REPORT_INSIGHTS_PROMPT_TEMPLATE.format(
        goal_type=data.get('goal_type'),
        base_calorie_target=data.get('base_calorie_target'),
        consumed_calories=data.get('consumed_calories'),
        workout_summary_str=workout_summary_str,
        exercise_net_calories_burned=data.get('exercise_net_calories_burned'),
        adjusted_calorie_target=data.get('adjusted_calorie_target'),
        consumed_protein_g=data.get('consumed_protein_g'),
        target_protein_g=data.get('target_protein_g'),
        consumed_carb_g=data.get('consumed_carb_g'),
        target_carb_g=data.get('target_carb_g'),
        consumed_fat_g=data.get('consumed_fat_g'),
        target_fat_g=data.get('target_fat_g'),
        micros_str=micros_str,
        meal_names_str=meal_names_str,
        goal_hit_status='SUCCESSFUL (Goal Hit)' if data.get('is_goal_hit') else 'IN PROGRESS',
    )

    # Smart Analytical Fallback Insights (evaluated when Gemini is offline or rate-limited)
    consumed_cals = data.get('consumed_calories', 0)
    adj_target_cals = data.get('adjusted_calorie_target', 2000)
    consumed_prot = data.get('consumed_protein_g', 0)
    target_prot = data.get('target_protein_g', 100)
    goal = data.get('goal_type', 'maintenance')
    sodium_mg = micros.get('sodium_mg', 0)
    fiber_g = micros.get('fiber_g', 0)

    cal_diff = consumed_cals - adj_target_cals
    if cal_diff > 300:
        insight_1 = f"Caloric Surplus Analysis: Total intake of {consumed_cals} kcal exceeded your adjusted target of {adj_target_cals} kcal by {cal_diff} kcal. To stay aligned with your {goal} goal, focus on moderating heavy meal portion sizes tomorrow."
    elif cal_diff < -300:
        insight_1 = f"Energy Deficit Notice: Intake of {consumed_cals} kcal fell below your adjusted target of {adj_target_cals} kcal by {abs(cal_diff)} kcal. Ensure adequate energy intake to prevent metabolic slowdown and preserve lean muscle."
    else:
        insight_1 = f"Optimal Energy Balance: Intake of {consumed_cals} kcal hit your adjusted daily target zone ({adj_target_cals} kcal), maintaining steady energy and supporting your {goal} strategy."

    if consumed_prot >= target_prot:
        insight_2 = f"Protein & Recovery Synthesis: Excellent protein intake ({consumed_prot}g vs target {target_prot}g), providing optimal amino acid availability for muscle tissue repair and synthesis after your logged workout(s)."
    else:
        insight_2 = f"Protein Synthesis Alert: Protein intake reached {consumed_prot}g (short of your {target_prot}g target). Prioritize high-quality protein sources like eggs, poultry, or legumes early tomorrow."

    if sodium_mg > 3500:
        insight_3 = f"Hydration & Electrolyte Recommendation: Elevated sodium intake recorded ({sodium_mg}mg). Increase fluid intake to 3+ liters tomorrow to maintain cellular hydration and flush out excess sodium."
    elif fiber_g < 25:
        insight_3 = f"Micronutrient Recommendation: Dietary fiber reached {fiber_g}g. Incorporate more whole grains, leafy greens, or legumes tomorrow to improve gut microbiota health and digestive satiety."
    else:
        insight_3 = f"Holistic Action Plan: Solid tracking today with {fiber_g}g fiber logged! Maintain consistent hydration, quality sleep, and balanced meal timing tomorrow."

    dynamic_fallback = [insight_1, insight_2, insight_3]

    try:
        parsed = generate_structured_output(prompt=prompt, response_schema=DailyInsightsSchema)
        return parsed.insights
    except Exception as e:
        logger.warning(f"Failed to generate Gemini AI insights for email report: {e}. Retrying once after pause...")
        try:
            import time
            time.sleep(2.0)
            parsed = generate_structured_output(prompt=prompt, response_schema=DailyInsightsSchema)
            return parsed.insights
        except Exception as retry_err:
            logger.error(f"Gemini API retry failed: {retry_err}. Using smart analytical fallback.")
            return dynamic_fallback


def generate_daily_html_report(db: Session, user: UserAuth, target_date: Optional[date] = None) -> Dict[str, Any]:
    """Generates a complete, glassmorphic HTML daily report document and metadata for a user.

    Args:
        db: Database session.
        user: Authenticated UserAuth entity.
        target_date: Target date for daily report (defaults to today).

    Returns:
        Dictionary containing email subject, html_content, and summary statistics.
    """
    if target_date is None:
        target_date = date.today()

    target_date_str = target_date.strftime("%Y-%m-%d")
    day_detail_raw = analytics_service.get_day_detail_summary(db=db, user=user, target_date_str=target_date_str)
    day_detail = day_detail_raw.model_dump() if hasattr(day_detail_raw, "model_dump") else (day_detail_raw if isinstance(day_detail_raw, dict) else dict(day_detail_raw))

    profile = user.profile

    user_name = (profile.name if profile and profile.name else user.email.split("@")[0]).capitalize()
    formatted_date = target_date.strftime("%A, %B %d, %Y")

    # Generate Gemini Insights
    insights = generate_daily_report_insights(day_detail)

    cals_consumed = day_detail["consumed_calories"]
    target_cals = day_detail["base_calorie_target"]
    workout_burn = day_detail["exercise_net_calories_burned"]
    adj_target = day_detail["adjusted_calorie_target"]
    goal_hit = day_detail["is_goal_hit"]

    prot_consumed = day_detail["consumed_protein_g"]
    prot_target = day_detail["target_protein_g"]
    carb_consumed = day_detail["consumed_carb_g"]
    carb_target = day_detail["target_carb_g"]
    fat_consumed = day_detail["consumed_fat_g"]
    fat_target = day_detail["target_fat_g"]

    micros = day_detail.get("total_micronutrients", {}) or {}

    status_badge = (
        '<span style="display: inline-block; white-space: nowrap; background: rgba(16, 185, 129, 0.2); color: #10B981; padding: 5px 14px; border-radius: 20px; font-weight: 700; font-size: 0.8rem; border: 1px solid rgba(16, 185, 129, 0.4);">🎉 GOAL ACHIEVED</span>'
        if goal_hit
        else '<span style="display: inline-block; white-space: nowrap; background: rgba(245, 158, 11, 0.2); color: #F59E0B; padding: 5px 14px; border-radius: 20px; font-weight: 700; font-size: 0.8rem; border: 1px solid rgba(245, 158, 11, 0.4);">📊 DAY IN PROGRESS</span>'
    )

    insights_html = "".join(
        [
            f'<li style="margin-bottom: 8px; color: #E2E8F0; font-size: 0.95rem; line-height: 1.5;">✨ {item}</li>'
            for item in insights
        ]
    )

    html_content = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GetFit Daily Summary - {formatted_date}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0F172A; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F8FAFC;">
  <div style="max-width: 620px; margin: 20px auto; background: #1E293B; border-radius: 16px; overflow: hidden; border: 1px solid #334155; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #6366F1 0%, #3B82F6 100%); padding: 32px 24px; text-align: center;">
      <h1 style="margin: 0; color: #FFFFFF; font-size: 1.8rem; font-weight: 800; tracking-style: tight;">⚡ GetFit Daily Report</h1>
      <p style="margin: 6px 0 0 0; color: #E0E7FF; font-size: 0.95rem;">{formatted_date} | Prepared for {user_name}</p>
    </div>

    <!-- Main Container -->
    <div style="padding: 28px 24px;">
      
      <!-- Top Status Card (Table Layout for Universal Email Client Compatibility) -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; background-color: #0F172A; border: 1px solid #334155; border-radius: 12px; margin-bottom: 24px; border-collapse: separate;">
        <tr>
          <td style="padding: 16px 20px; vertical-align: middle; text-align: left; width: 50%;">
            <div style="font-size: 0.75rem; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; margin-bottom: 6px;">Daily Status</div>
            <div>{status_badge}</div>
          </td>
          <td style="padding: 16px 20px; vertical-align: middle; text-align: right; width: 50%;">
            <div style="font-size: 0.75rem; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; margin-bottom: 4px;">Net Calories</div>
            <div style="font-size: 1.35rem; font-weight: 800; color: #38BDF8; line-height: 1.2;">{cals_consumed} <span style="font-size: 0.85rem; color: #94A3B8; font-weight: 600;">/ {adj_target} kcal</span></div>
          </td>
        </tr>
      </table>

      <!-- AI Insights Box -->
      <div style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 12px 0; color: #818CF8; font-size: 1.05rem; font-weight: 700;">💡 Daily Health & Performance Insights</h3>
        <ul style="margin: 0; padding-left: 20px;">
          {insights_html}
        </ul>
      </div>

      <!-- Energy & Workout Summary Grid -->
      <h3 style="margin: 0 0 12px 0; color: #F8FAFC; font-size: 1.1rem; border-bottom: 1px solid #334155; padding-bottom: 8px;">🔥 Daily Energy & Workouts</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr>
          <td style="padding: 10px; background: #0F172A; border-radius: 8px; width: 50%; border: 1px solid #334155;">
            <div style="font-size: 0.75rem; color: #94A3B8;">Base Target</div>
            <div style="font-size: 1.1rem; font-weight: 700; color: #F8FAFC;">{target_cals} kcal</div>
          </td>
          <td style="width: 4px;"></td>
          <td style="padding: 10px; background: #0F172A; border-radius: 8px; width: 50%; border: 1px solid #334155;">
            <div style="font-size: 0.75rem; color: #94A3B8;">Workout Calories Burned</div>
            <div style="font-size: 1.1rem; font-weight: 700; color: #10B981;">-{workout_burn} kcal</div>
          </td>
        </tr>
      </table>

      <!-- Macronutrients Summary -->
      <h3 style="margin: 0 0 12px 0; color: #F8FAFC; font-size: 1.1rem; border-bottom: 1px solid #334155; padding-bottom: 8px;">🥩 Macronutrient Budget</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr style="border-bottom: 1px solid #334155; color: #94A3B8; font-size: 0.8rem; text-align: left;">
          <th style="padding: 8px 0;">Nutrient</th>
          <th style="padding: 8px 0;">Consumed</th>
          <th style="padding: 8px 0;">Target</th>
          <th style="padding: 8px 0;">Completion</th>
        </tr>
        <tr>
          <td style="padding: 10px 0; font-weight: 600; color: #F8FAFC;">Protein</td>
          <td style="padding: 10px 0; color: #38BDF8;">{prot_consumed}g</td>
          <td style="padding: 10px 0; color: #94A3B8;">{prot_target}g</td>
          <td style="padding: 10px 0; font-weight: 700; color: #10B981;">{round((prot_consumed/max(prot_target,1))*100)}%</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; font-weight: 600; color: #F8FAFC;">Carbohydrates</td>
          <td style="padding: 10px 0; color: #F59E0B;">{carb_consumed}g</td>
          <td style="padding: 10px 0; color: #94A3B8;">{carb_target}g</td>
          <td style="padding: 10px 0; font-weight: 700; color: #10B981;">{round((carb_consumed/max(carb_target,1))*100)}%</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; font-weight: 600; color: #F8FAFC;">Fats</td>
          <td style="padding: 10px 0; color: #EC4899;">{fat_consumed}g</td>
          <td style="padding: 10px 0; color: #94A3B8;">{fat_target}g</td>
          <td style="padding: 10px 0; font-weight: 700; color: #10B981;">{round((fat_consumed/max(fat_target,1))*100)}%</td>
        </tr>
      </table>

      <!-- Micronutrients Table -->
      <h3 style="margin: 0 0 12px 0; color: #F8FAFC; font-size: 1.1rem; border-bottom: 1px solid #334155; padding-bottom: 8px;">🥗 Essential Micronutrients</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 0.85rem;">
        <tr style="color: #94A3B8;">
          <td style="padding: 6px 0;">Fiber: <strong style="color: #F8FAFC;">{micros.get('fiber_g', 0)}g</strong> / 30g</td>
          <td style="padding: 6px 0;">Sodium: <strong style="color: #F8FAFC;">{micros.get('sodium_mg', 0)}mg</strong> / 2300mg</td>
        </tr>
        <tr style="color: #94A3B8;">
          <td style="padding: 6px 0;">Potassium: <strong style="color: #F8FAFC;">{micros.get('potassium_mg', 0)}mg</strong> / 3400mg</td>
          <td style="padding: 6px 0;">Vitamin C: <strong style="color: #F8FAFC;">{micros.get('vitamin_c_mg', 0)}mg</strong> / 90mg</td>
        </tr>
        <tr style="color: #94A3B8;">
          <td style="padding: 6px 0;">Calcium: <strong style="color: #F8FAFC;">{micros.get('calcium_mg', 0)}mg</strong> / 1000mg</td>
          <td style="padding: 6px 0;">Iron: <strong style="color: #F8FAFC;">{micros.get('iron_mg', 0)}mg</strong> / 18mg</td>
        </tr>
      </table>

    </div>

    <!-- Footer -->
    <div style="background: #0F172A; padding: 20px 24px; text-align: center; border-top: 1px solid #334155; font-size: 0.8rem; color: #64748B;">
      <p style="margin: 0;">GetFit Health & Performance Intelligence Platform</p>
      <p style="margin: 4px 0 0 0;">You received this automated report based on your profile preferences.</p>
    </div>

  </div>
</body>
</html>
"""

    subject = f"⚡ GetFit Daily Summary - {formatted_date} {'[Goal Achieved!]' if goal_hit else ''}"

    return {
        "subject": subject,
        "html_content": html_content,
        "summary": day_detail,
        "insights": insights,
    }


def send_nightly_email_report(db: Session, user: UserAuth, target_date: Optional[date] = None) -> Dict[str, Any]:
    """Generates and dispatches the nightly health & nutrition HTML email report to user via Resend.

    Args:
        db: Database session.
        user: Authenticated UserAuth entity.
        target_date: Target date for daily report (defaults to today).

    Returns:
        Dictionary with dispatch status, resend response ID, or simulated test log.
    """
    report_data = generate_daily_html_report(db=db, user=user, target_date=target_date)

    recipient_email = user.email
    subject = report_data["subject"]
    html_content = report_data["html_content"]

    if settings.RESEND_API_KEY and resend is not None:
        try:
            resend.api_key = settings.RESEND_API_KEY
            params = {
                "from": settings.RESEND_FROM_EMAIL,
                "to": [recipient_email],
                "subject": subject,
                "html": html_content,
            }
            email_response = resend.Emails.send(params)
            logger.info(f"Nightly email report sent successfully to {recipient_email} via Resend. ID: {email_response}")
            return {
                "status": "sent",
                "provider": "resend",
                "recipient": recipient_email,
                "resend_id": getattr(email_response, "id", str(email_response)),
                "subject": subject,
            }
        except Exception as e:
            logger.error(f"Failed to dispatch email via Resend API: {e}")
            return {
                "status": "error",
                "provider": "resend",
                "recipient": recipient_email,
                "error": str(e),
                "subject": subject,
            }
    else:
        logger.info(f"[DEV TEST MODE] RESEND_API_KEY absent. Simulated nightly email report for {recipient_email}.")
        return {
            "status": "simulated_success",
            "provider": "mock_test_mode",
            "recipient": recipient_email,
            "subject": subject,
            "note": "RESEND_API_KEY is not set in environment. Email HTML report was successfully generated and verified.",
        }
