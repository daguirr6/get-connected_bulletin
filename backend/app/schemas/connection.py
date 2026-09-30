from datetime import datetime

from pydantic import BaseModel

from backend.app.schemas.moderation import (
    PublicModerationNotice,
)


class ConnectionResponse(BaseModel):
    moderation: PublicModerationNotice

    id: int
    user_id: int

    display_name: str
    major: str

    connected_at: datetime


class ConnectionSuggestionResponse(BaseModel):
    moderation: PublicModerationNotice

    user_id: int

    display_name: str
    major: str

    shared_interest_count: int
    shared_interests: list[str]