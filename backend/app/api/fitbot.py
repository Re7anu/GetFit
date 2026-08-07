"""FitBot AI Coach Chatbot API endpoints module."""

from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.auth_dependencies import get_current_user
from app.db.models.user_auth import UserAuth
from app.db.session import get_db
from app.schemas.fitbot import (
    FitBotChatRequest,
    FitBotChatResponse,
    FitBotMessageSchema,
    FitBotSessionSchema,
    FitBotSessionListResponse,
)
from app.services import fitbot_service

router = APIRouter()


@router.post("/chat", response_model=FitBotChatResponse)
def send_fitbot_message(
    request_in: FitBotChatRequest,
    current_user: UserAuth = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Sends a user prompt to FitBot AI Coach, generating personalized guidance and quick replies."""
    return fitbot_service.send_chat_message(
        db=db,
        user=current_user,
        user_message=request_in.message,
        session_id=request_in.session_id,
    )


@router.get("/sessions", response_model=FitBotSessionListResponse)
def list_fitbot_sessions(
    current_user: UserAuth = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves all chat sessions for the authenticated user."""
    return fitbot_service.get_user_sessions(db=db, user=current_user)


@router.post("/sessions", response_model=FitBotSessionSchema, status_code=status.HTTP_201_CREATED)
def create_fitbot_session(
    title: Optional[str] = "New Chat",
    current_user: UserAuth = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Creates a new FitBot chat conversation session."""
    return fitbot_service.create_chat_session(db=db, user=current_user, title=title or "New Chat")


@router.get("/sessions/{session_id}/messages", response_model=List[FitBotMessageSchema])
def get_fitbot_session_messages(
    session_id: str,
    current_user: UserAuth = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves all conversation messages within a specific session."""
    return fitbot_service.get_session_messages(db=db, user=current_user, session_id=session_id)


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_fitbot_session(
    session_id: str,
    current_user: UserAuth = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Deletes a chat session and all its message history."""
    fitbot_service.delete_chat_session(db=db, user=current_user, session_id=session_id)
