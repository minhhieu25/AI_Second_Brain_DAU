from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "DAU Second Brain API"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/dau_second_brain_mine"
    GEMINI_API_KEY: str | None = None
    ZAI_API_KEY: str | None = None
    SECRET_KEY: str = "fallback_secret_for_development_only"
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:4173", "http://localhost:5174"]

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"

settings = Settings()

