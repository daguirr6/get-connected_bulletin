from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from backend.app.schemas.moderation import (
    PublicModerationNotice,
)


PostItColor = Literal[
    "yellow",
    "lime",
    "sky",
    "pink",
    "purple",
    "peach",
    "mint",
]


class PostItCreate(BaseModel):
    display_name: str = Field(
        min_length=1,
        max_length=80,
    )

    fun_facts: str = Field(
        min_length=1,
        max_length=1000,
    )

    song_title: str = Field(
        min_length=1,
        max_length=150,
    )

    song_artist: str | None = Field(
        default=None,
        max_length=150,
    )

    color: PostItColor = "yellow"


class PostItUpdate(BaseModel):
    display_name: str | None = Field(
        default=None,
        min_length=1,
        max_length=80,
    )

    fun_facts: str | None = Field(
        default=None,
        min_length=1,
        max_length=1000,
    )

    song_title: str | None = Field(
        default=None,
        min_length=1,
        max_length=150,
    )

    song_artist: str | None = Field(
        default=None,
        max_length=150,
    )

    color: PostItColor | None = None


class PostItResponse(BaseModel):
    moderation: PublicModerationNotice

    id: int
    user_id: int

    display_name: str
    major: str

    fun_facts: str

    song_title: str
    song_artist: str | None

    color: PostItColor

    created_at: datetime