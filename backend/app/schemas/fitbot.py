"""FitBot AI Coach Chatbot Pydantic data schemas module."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class FitBotNavigationAction(BaseModel):
    """Schema for AI coach app navigation suggestions."""

    target_tab: Optional[str] = Field(None, description="App tab name to navigate to: 'dashboard', 'nutrition', 'workouts', 'analytics', 'profile'.")
    action_label: Optional[str] = Field(None, description="Short 2-4 word button label e.g. 'Log Breakfast Now'.")


class FitBotStructuredReply(BaseModel):
    """Pydantic schema for structured LiteLLM completion responses from FitBot."""

    reply: str = Field(..., description="Actionable, personalized, empathetic coaching reply.")
    suggested_quick_replies: List[str] = Field(
        default_factory=list,
        max_length=3,
        description="Exactly 2-3 short context-aware follow-up question prompts for the user.",
    )
    navigation: Optional[FitBotNavigationAction] = Field(None, description="Optional navigation shortcut button if relevant.")


class FitBotChatRequest(BaseModel):
    """Request schema for sending a prompt to FitBot."""

    message: str = Field(..., min_length=1, max_length=2000, description="User question or prompt.")
    session_id: Optional[str] = Field(None, description="Optional chat session ID. If omitted, a new chat session is created automatically.")


class FitBotMessageSchema(BaseModel):
    """Schema for individual message in conversation history."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    session_id: str
    role: str
    message: str
    navigation: Optional[FitBotNavigationAction] = None
    created_at: datetime


class FitBotSessionSchema(BaseModel):
    """Schema for chat session metadata summary."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0


class FitBotChatResponse(BaseModel):
    """Response schema returned after FitBot processes a message."""

    session_id: str
    reply: str
    suggested_quick_replies: List[str] = Field(default_factory=list)
    navigation: Optional[FitBotNavigationAction] = None
    created_at: datetime


class FitBotSessionListResponse(BaseModel):
    """Response schema listing user chat sessions."""

    sessions: List[FitBotSessionSchema]
