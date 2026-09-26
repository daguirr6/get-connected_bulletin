from datetime import datetime

from pydantic import BaseModel, Field


class MessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)


class MessageResponse(BaseModel):
    id: int
    connection_id: int
    sender_id: int
    content: str
    created_at: datetime
    read_at: datetime | None


class ChatSummaryResponse(BaseModel):
    connection_id: int
    user_id: int
    display_name: str
    major: str
    last_message: str | None
    last_sender_id: int | None
    last_message_at: datetime | None
    unread_count: int


class MarkReadResponse(BaseModel):
    connection_id: int
    marked_read: int