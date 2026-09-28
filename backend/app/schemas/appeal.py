from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class AppealCreate(BaseModel):
    reason: str = Field(
        min_length=20,
        max_length=3000,
    )


class MyModerationActionResponse(BaseModel):
    id: int
    level: str
    public_summary: str
    status: str
    created_at: datetime
    expires_at: datetime | None

    appeal_id: int | None
    appeal_status: str | None


class AppealResponse(BaseModel):
    id: int
    moderation_action_id: int

    moderation_level: str
    public_summary: str

    reason: str
    status: str

    response_to_user: str | None

    created_at: datetime
    reviewed_at: datetime | None


class PendingAppealResponse(BaseModel):
    id: int
    moderation_action_id: int

    user_id: int
    username: str

    moderation_level: str
    public_summary: str

    reason: str
    source_report_id: int | None

    created_at: datetime


class AppealReviewRequest(BaseModel):
    decision: Literal[
        "accepted",
        "denied",
    ]

    response_to_user: str = Field(
        min_length=3,
        max_length=1000,
    )

    private_admin_note: str | None = Field(
        default=None,
        max_length=2000,
    )


class AppealReviewResponse(BaseModel):
    appeal_id: int
    moderation_action_id: int
    user_id: int

    decision: str
    moderation_action_status: str

    response_to_user: str

    reviewed_at: datetime