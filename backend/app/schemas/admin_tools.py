from datetime import (
    date,
    datetime,
)
from typing import Literal

from pydantic import (
    BaseModel,
    Field,
)


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
    full_name: str | None
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


class DailyUsagePoint(BaseModel):
    day_name: str
    date: date
    this_week: int
    last_week: int


class TimeUsagePoint(BaseModel):
    hour: int
    label: str
    count: int
    percentage: float


class AdminWeeklyAnalyticsResponse(
    BaseModel
):
    this_week_start: date
    this_week_end: date

    last_week_start: date
    last_week_end: date

    this_week_unique_users: int
    last_week_unique_users: int

    weekly_change_percent: (
        float | None
    )

    busiest_day: str | None
    quietest_day: str | None

    days: list[
        DailyUsagePoint
    ]

    times: list[
        TimeUsagePoint
    ]