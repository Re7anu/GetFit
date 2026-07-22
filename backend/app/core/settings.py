from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "GetFit"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    DATABASE_URL: str = "postgresql://postgres:postgrespassword@localhost:5433/getfit"
    GEMINI_API_KEY: Optional[str] = None
    EMAIL_SMTP_HOST: str = "smtp.gmail.com"
    EMAIL_SMTP_PORT: int = 587
    EMAIL_SMTP_USER: str = ""
    EMAIL_SMTP_PASSWORD: str = ""
    EMAIL_FROM_EMAIL: str = "noreply@getfit.com"
    EMAIL_FROM_NAME: str = "GetFit"
    ENVIRONMENT: str = "development"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()
