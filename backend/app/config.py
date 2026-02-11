from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings

_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    MONGO_URI: str = "mongodb://localhost:27017/mad_photography"
    JWT_SECRET: str = "change-me-in-production"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-2"
    S3_BUCKET_NAME: str = "mad-photography-media"

    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    SENDGRID_API_KEY: str = ""
    FROM_EMAIL: str = "hello@madphotography.com"

    FRONTEND_URL: str = "http://localhost:5173"
    BACKEND_URL: str = "http://localhost:8000"

    class Config:
        env_file = str(_ENV_FILE)


@lru_cache()
def get_settings() -> Settings:
    return Settings()
