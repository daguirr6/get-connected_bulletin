from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    db_host: str
    db_port: int
    db_name: str
    db_user: str
    db_password: str

    jwt_secret: str
    access_token_expire_minutes: int = 60

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
    )


settings = Settings()