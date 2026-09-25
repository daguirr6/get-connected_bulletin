from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class PendingVerificationResponse(BaseModel):
    id: int
    user_id: int
    full_name: str
    major: str
    status: str
    submitted_at: datetime


class VerificationUpdateRequest(BaseModel):
    status: Literal["verified", "needs_info"]
    admin_note: str | None = Field(default=None, max_length=500)


class VerificationUpdateResponse(BaseModel):
    username: str
    verification_status: str
    message: str