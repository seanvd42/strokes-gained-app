"""
Application configuration
"""
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # Supabase
    SUPABASE_URL: str
    SUPABASE_KEY: str
    DATABASE_URL: str
    
    # Security
    SECRET_KEY: str = "development-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    
    # Application
    PROJECT_NAME: str = "Strokes Gained API"
    API_V1_STR: str = "/api"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
