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


class PendingReportResponse(BaseModel):
    id: int
    reporter_id: int
    reported_user_id: int
    reported_username: str
    category: str
    details: str
    status: str
    created_at: datetime


class ReportReviewRequest(BaseModel):
    decision: Literal[
        "upheld",
        "dismissed",
    ]

    level: Literal[
        "yellow",
        "red",
    ] | None = None

    public_summary: str | None = Field(
        default=None,
        max_length=500,
    )

    private_admin_note: str | None = Field(
        default=None,
        max_length=2000,
    )


class ReportReviewResponse(BaseModel):
    report_id: int
    reported_user_id: int
    reported_username: str
    decision: str
    moderation_level: str | None
    message: str


class ModerationActionResponse(BaseModel):
    id: int
    user_id: int
    level: str
    public_summary: str
    status: str
    created_at: datetime
    expires_at: datetime | None