from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from backend.app.schemas.profile import ProfileSongResponse


class PendingVerificationResponse(BaseModel):
    id: int
    user_id: int
    full_name: str
    major: str
    status: str
    submitted_at: datetime


class VerificationUpdateRequest(BaseModel):
    status: Literal["verified", "needs_info"]
    admin_note: str | None = Field(
        default=None,
        max_length=500,
    )


class VerificationUpdateResponse(BaseModel):
    username: str
    verification_status: str
    message: str


class PendingProfileResponse(BaseModel):
    id: int
    user_id: int
    username: str

    about_me: str | None
    interests: str | None
    favorite_quote: str | None

    background_style: str | None
    font_style: str | None
    profile_picture_url: str | None

    songs: list[ProfileSongResponse]

    status: str
    submitted_at: datetime | None


class ProfileReviewRequest(BaseModel):
    status: Literal[
        "approved",
        "needs_changes",
    ]

    admin_note: str | None = Field(
        default=None,
        max_length=1000,
    )


class ProfileReviewResponse(BaseModel):
    id: int
    user_id: int
    username: str
    status: str
    admin_note: str | None
    reviewed_at: datetime
    message: str