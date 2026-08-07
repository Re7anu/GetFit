"""FitBot AI Coach Chatbot domain service module."""

from datetime import date, datetime
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from loguru import logger

from app.db.models.user_auth import UserAuth
from app.db.models.fitbot import FitBotSession, FitBotChatMessage
from app.schemas.fitbot import (
    FitBotChatResponse,
    FitBotMessageSchema,
    FitBotNavigationAction,
    FitBotSessionSchema,
    FitBotSessionListResponse,
    FitBotStructuredReply,
)
from app.services import analytics_service, profile_service
from app.services.ai_service import generate_structured_output
from app.core.prompts import FITBOT_SYSTEM_PROMPT_TEMPLATE


def create_chat_session(db: Session, user: UserAuth, title: str = "New Chat") -> FitBotSessionSchema:
    """Creates a new FitBot chat session for the user."""
    session = FitBotSession(user_id=user.id, title=title)
    db.add(session)
    db.commit()
    db.refresh(session)
    logger.info("Created FitBot session (id='{}', user='{}')", session.id, user.id)
    return FitBotSessionSchema(
        id=session.id,
        title=session.title,
        created_at=session.created_at,
        updated_at=session.updated_at,
        message_count=0,
    )


def get_user_sessions(db: Session, user: UserAuth) -> FitBotSessionListResponse:
    """Retrieves all chat sessions for the user sorted by updated_at descending."""
    sessions = (
        db.query(FitBotSession)
        .filter(FitBotSession.user_id == user.id)
        .order_by(FitBotSession.updated_at.desc())
        .all()
    )
    result = []
    for s in sessions:
        msg_count = db.query(FitBotChatMessage).filter(FitBotChatMessage.session_id == s.id).count()
        result.append(
            FitBotSessionSchema(
                id=s.id,
                title=s.title,
                created_at=s.created_at,
                updated_at=s.updated_at,
                message_count=msg_count,
            )
        )
    return FitBotSessionListResponse(sessions=result)


def delete_chat_session(db: Session, user: UserAuth, session_id: str) -> None:
    """Deletes a chat session and all associated messages."""
    session = (
        db.query(FitBotSession)
        .filter(FitBotSession.id == session_id, FitBotSession.user_id == user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found.")
    db.delete(session)
    db.commit()
    logger.info("Deleted FitBot session (id='{}', user='{}')", session_id, user.id)


def get_session_messages(db: Session, user: UserAuth, session_id: str) -> List[FitBotMessageSchema]:
    """Retrieves all messages for a specific session sorted by created_at ascending."""
    session = (
        db.query(FitBotSession)
        .filter(FitBotSession.id == session_id, FitBotSession.user_id == user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found.")

    messages = (
        db.query(FitBotChatMessage)
        .filter(FitBotChatMessage.session_id == session_id)
        .order_by(FitBotChatMessage.created_at.asc())
        .all()
    )
    result = []
    for m in messages:
        nav = None
        if m.navigation_target:
            nav = FitBotNavigationAction(target_tab=m.navigation_target, action_label=m.navigation_label)
        result.append(
            FitBotMessageSchema(
                id=m.id,
                session_id=m.session_id,
                role=m.role,
                message=m.message,
                navigation=nav,
                created_at=m.created_at,
            )
        )
    return result


def send_chat_message(
    db: Session,
    user: UserAuth,
    user_message: str,
    session_id: Optional[str] = None,
) -> FitBotChatResponse:
    """Sends a user prompt to FitBot, injects live profile/nutrition context, and saves messages."""
    # 1. Resolve or create chat session
    session = None
    if session_id:
        session = (
            db.query(FitBotSession)
            .filter(FitBotSession.id == session_id, FitBotSession.user_id == user.id)
            .first()
        )
    if not session:
        # Generate initial title from first 30 chars of message
        title_summary = user_message[:30].strip() + ("..." if len(user_message) > 30 else "")
        session = FitBotSession(user_id=user.id, title=title_summary or "New Chat")
        db.add(session)
        db.commit()
        db.refresh(session)

    # 2. Save user message to database
    user_msg_record = FitBotChatMessage(
        session_id=session.id,
        user_id=user.id,
        role="user",
        message=user_message,
    )
    db.add(user_msg_record)

    # Update session updated_at timestamp
    session.updated_at = datetime.utcnow()
    db.commit()

    # 3. Gather live user profile and today's analytics summary context
    profile_data = user.profile
    today_summary = analytics_service.get_day_detail_summary(db=db, user=user, target_date_str=date.today().isoformat())
    today_dict = today_summary if isinstance(today_summary, dict) else dict(today_summary)

    # Extract user physical stats
    user_name = profile_data.name if profile_data else "User"
    goal_type = profile_data.goal_type if profile_data else "maintain"
    fitness_focus = profile_data.fitness_focus if profile_data else "athletic"
    height_cm = profile_data.height_cm if profile_data else 175.0
    weight_kg = profile_data.weight_kg if profile_data else 70.0
    target_weight_kg = profile_data.target_weight_kg if profile_data else weight_kg
    timeline_weeks = profile_data.timeline_weeks if profile_data else 12
    bmr = profile_data.bmr if profile_data else 1600.0
    tdee = profile_data.tdee if profile_data else 2200.0
    calculated_calorie_target = profile_data.calculated_calorie_target if profile_data else 2000

    # Extract today's metrics
    consumed_calories = today_dict.get("consumed_calories", 0)
    adjusted_calorie_target = today_dict.get("adjusted_calorie_target", calculated_calorie_target)
    consumed_protein_g = today_dict.get("consumed_protein_g", 0.0)
    target_protein_g = today_dict.get("target_protein_g", 150.0)
    consumed_carb_g = today_dict.get("consumed_carb_g", 0.0)
    target_carb_g = today_dict.get("target_carb_g", 200.0)
    consumed_fat_g = today_dict.get("consumed_fat_g", 0.0)
    target_fat_g = today_dict.get("target_fat_g", 60.0)

    micros = today_dict.get("total_micronutrients", {}) or {}
    workouts_list = today_dict.get("workouts", [])
    net_calories_burned = today_dict.get("exercise_net_calories_burned", 0)
    workouts_summary_str = ", ".join([f"{w.get('exercise_name')} ({w.get('duration_minutes')}m)" for w in workouts_list]) if workouts_list else "None logged"

    # 4. Fetch recent session chat history (last 6 messages)
    recent_msgs = (
        db.query(FitBotChatMessage)
        .filter(FitBotChatMessage.session_id == session.id)
        .order_by(FitBotChatMessage.created_at.desc())
        .limit(6)
        .all()
    )
    recent_msgs.reverse()
    chat_history_str = "\n".join([f"{m.role.capitalize()}: {m.message}" for m in recent_msgs if m.id != user_msg_record.id]) or "No prior messages."

    # 5. Format system prompt template
    prompt = FITBOT_SYSTEM_PROMPT_TEMPLATE.format(
        user_name=user_name,
        goal_type=goal_type,
        fitness_focus=fitness_focus,
        height_cm=height_cm,
        weight_kg=weight_kg,
        target_weight_kg=target_weight_kg,
        timeline_weeks=timeline_weeks,
        bmr=int(bmr),
        tdee=int(tdee),
        calculated_calorie_target=calculated_calorie_target,
        today_date=date.today().isoformat(),
        consumed_calories=consumed_calories,
        adjusted_calorie_target=adjusted_calorie_target,
        consumed_protein_g=round(consumed_protein_g, 1),
        target_protein_g=round(target_protein_g, 1),
        consumed_carb_g=round(consumed_carb_g, 1),
        target_carb_g=round(target_carb_g, 1),
        consumed_fat_g=round(consumed_fat_g, 1),
        target_fat_g=round(target_fat_g, 1),
        fiber_g=micros.get("fiber_g", 0),
        sodium_mg=micros.get("sodium_mg", 0),
        potassium_mg=micros.get("potassium_mg", 0),
        vitamin_c_mg=micros.get("vitamin_c_mg", 0),
        calcium_mg=micros.get("calcium_mg", 0),
        iron_mg=micros.get("iron_mg", 0),
        workouts_summary_str=workouts_summary_str,
        net_calories_burned=net_calories_burned,
        chat_history_str=chat_history_str,
        user_prompt=user_message,
    )

    # 6. Execute AI completion or fallback if API key unconfigured
    ai_reply = None
    try:
        ai_reply = generate_structured_output(prompt=prompt, response_schema=FitBotStructuredReply)
    except Exception as e:
        logger.warning("FitBot LiteLLM execution failed or key unconfigured ({}), using intelligent fallback.", e)
        # Fallback intelligent response
        ai_reply = FitBotStructuredReply(
            reply=f"Great question! Based on your target of {calculated_calorie_target} kcal and {target_protein_g}g protein, focus on balanced whole foods and consistent movement today.",
            suggested_quick_replies=[
                "How can I hit my protein goal today?",
                "Am I on track for my target weight?",
                "Suggest a quick post-workout snack",
            ],
            navigation=FitBotNavigationAction(target_tab="nutrition", action_label="Open Meal Logger") if "food" in user_message.lower() or "eat" in user_message.lower() else None,
        )

    # 7. Save assistant reply to database
    nav_target = ai_reply.navigation.target_tab if ai_reply.navigation else None
    nav_label = ai_reply.navigation.action_label if ai_reply.navigation else None

    assistant_msg_record = FitBotChatMessage(
        session_id=session.id,
        user_id=user.id,
        role="assistant",
        message=ai_reply.reply,
        navigation_target=nav_target,
        navigation_label=nav_label,
    )
    db.add(assistant_msg_record)
    session.updated_at = datetime.utcnow()
    db.commit()

    return FitBotChatResponse(
        session_id=session.id,
        reply=ai_reply.reply,
        suggested_quick_replies=ai_reply.suggested_quick_replies or [],
        navigation=ai_reply.navigation,
        created_at=assistant_msg_record.created_at,
    )
