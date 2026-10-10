from datetime import datetime

from pydantic import BaseModel


class ChangelogEntryResponse(
    BaseModel
):
    id: int
    title: str
    category: str
    summary: str
    published_at: datetime
    is_unread: bool


class ChangelogResponse(
    BaseModel
):
    entries: list[
        ChangelogEntryResponse
    ]

    unread_count: int


class ChangelogSeenResponse(
    BaseModel
):
    unread_count: int
    message: str