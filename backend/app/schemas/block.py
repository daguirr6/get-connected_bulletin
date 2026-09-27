from datetime import datetime

from pydantic import BaseModel, Field


class BlockCreate(BaseModel):
    reason: str = Field(
        min_length=3,
        max_length=1000,
    )


class BlockResponse(BaseModel):
    id: int
    blocked_user_id: int
    username: str
    reason: str
    created_at: datetime