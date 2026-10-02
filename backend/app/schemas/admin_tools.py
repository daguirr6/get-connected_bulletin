from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class AdminPostItResponse(BaseModel):
    id: int
    user_id: int
    username: str
    display_name: str
    major: str
    fun_facts: str
    song_title: str
    song_artist: str | None
    color: str
    created_at: datetime


class AdminPostItRemovalRequest(BaseModel):
    reason: str = Field(
        min_length=3,
        max_length=1000,
    )


class AdminPostItRemovalResponse(BaseModel):
    post_it_id: int
    user_id: int
    username: str
    message: str


class AdminUserSummaryResponse(BaseModel):
    id: int
    username: str
    display_name: str | None
    major: str | None
    role: str
    verification_status: str
    account_status: str
    created_at: datetime


class AdminAccountStatusRequest(BaseModel):
    account_status: Literal[
        "active",
        "suspended",
        "removed",
    ]

    reason: str = Field(
        min_length=3,
        max_length=1000,
    )


class AdminAccountStatusResponse(BaseModel):
    user_id: int
    username: str
    account_status: str
    message: str


class AdminAccountDeleteRequest(BaseModel):
    confirm_username: str = Field(
        min_length=1,
        max_length=50,
    )

    reason: str = Field(
        min_length=3,
        max_length=1000,
    )


class AdminAccountDeleteResponse(BaseModel):
    user_id: int
    username: str
    message: str