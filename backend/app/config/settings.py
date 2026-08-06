"""Global application configuration settings management module."""

from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables and defaults.

    Attributes:
        PROJECT_NAME: The human-readable name of the application.
        API_V1_STR: API version 1 route prefix.
        SECRET_KEY: Secret key used for cryptographic signing of JWTs.
        ACCESS_TOKEN_EXPIRE_MINUTES: Access token lifetime in minutes.
        REFRESH_TOKEN_EXPIRE_DAYS: Refresh token lifetime in days.
        DATABASE_URL: Connection string for PostgreSQL database.
        GEMINI_API_KEY: Optional API key for Google Gemini LLM integrations.
        EMAIL_SMTP_HOST: SMTP mail server hostname.
        EMAIL_SMTP_PORT: SMTP mail server port.
        EMAIL_SMTP_USER: SMTP authentication username.
        EMAIL_SMTP_PASSWORD: SMTP authentication password.
        EMAIL_FROM_EMAIL: Sender email address for outgoing reports.
        EMAIL_FROM_NAME: Display name for outgoing system emails.
        ENVIRONMENT: Current deployment environment (development/production).
    """

    PROJECT_NAME: str = "GetFit"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    DATABASE_URL: str = "postgresql://postgres:postgrespassword@localhost:5433/getfit"
    LLM_API_KEY: Optional[str] = None
    LLM_API_KEY_SECONDARY: Optional[str] = None
    AI_MODEL_NAME: str = "gemini/gemini-1.5-flash"
    AI_FALLBACK_MODEL_NAME: Optional[str] = "gemini/gemini-1.5-pro"
    RESEND_API_KEY: Optional[str] = None
    RESEND_FROM_EMAIL: str = "GetFit Daily <onboarding@resend.dev>"
    NIGHTLY_REPORT_HOUR: int = 21
    NIGHTLY_REPORT_MINUTE: int = 0
    EMAIL_SMTP_HOST: str = "smtp.gmail.com"
    EMAIL_SMTP_PORT: int = 587
    EMAIL_SMTP_USER: str = ""
    EMAIL_SMTP_PASSWORD: str = ""
    EMAIL_FROM_EMAIL: str = "noreply@getfit.com"
    EMAIL_FROM_NAME: str = "GetFit"
    ENVIRONMENT: str = "development"

    model_config = SettingsConfigDict(env_file=("../.env", ".env"), case_sensitive=True, extra="ignore")


settings = Settings()
