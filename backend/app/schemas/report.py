from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


ReportCategory = Literal[
    "harassment",
    "unwanted_messages",
    "threatening_behavior",
    "inappropriate_content",
    "impersonation",
    "spam",
    "other",
]


class ReportCreate(BaseModel):
    category: ReportCategory

    details: str = Field(
        min_length=5,
        max_length=2000,
    )


class ReportResponse(BaseModel):
    id: int
    reported_user_id: int
    username: str
    category: str
    details: str
    status: str
    created_at: datetime
    reviewed_at: datetime | None