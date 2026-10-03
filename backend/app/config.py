from pathlib import Path

from pydantic_settings import (
    BaseSettings,
    SettingsConfigDict,
)


BACKEND_DIR = (
    Path(__file__)
    .resolve()
    .parent
    .parent
)


class Settings(BaseSettings):
    db_host: str

    db_port: int = 5432

    db_name: str

    db_user: str

    db_password: str

    jwt_secret: str

    access_token_expire_minutes: int = 60


    # Feedback / Cloudflare email settings.
    #
    # These are optional so the rest of
    # Get Connected can still start even
    # if feedback email is not configured.
    cloudflare_account_id: (
        str | None
    ) = None

    cloudflare_email_api_token: (
        str | None
    ) = None

    feedback_from_email: str = (
        "feedback@getconnectedmason.com"
    )

    feedback_to_email: str = (
        "daguirr6@gmu.edu"
    )


    model_config = (
        SettingsConfigDict(
            env_file=(
                BACKEND_DIR
                / ".env"
            ),

            env_file_encoding=
                "utf-8",

            extra="ignore",
        )
    )


settings = Settings()