from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


BackgroundStyle = Literal[
    "paper",
    "stars",
    "grid",
    "retro",
    "clouds",
    "minimal",
]

FontStyle = Literal[
    "arial",
    "georgia",
    "courier",
    "verdana",
    "pixel",
]


class ProfileSongCreate(BaseModel):
    title: str = Field(
        min_length=1,
        max_length=150,
    )

    artist: str = Field(
        min_length=1,
        max_length=150,
    )


class ProfileSongResponse(BaseModel):
    id: int
    title: str
    artist: str
    position: int


class ProfileUpdate(BaseModel):
    about_me: str | None = Field(
        default=None,
        max_length=5000,
    )

    interests: str | None = Field(
        default=None,
        max_length=2000,
    )

    favorite_quote: str | None = Field(
        default=None,
        max_length=500,
    )

    background_style: BackgroundStyle | None = None
    font_style: FontStyle | None = None


class ProfileResponse(BaseModel):
    id: int
    user_id: int

    about_me: str | None
    interests: str | None
    favorite_quote: str | None

    background_style: str | None
    font_style: str | None

    songs: list[ProfileSongResponse]

    status: str
    admin_note: str | None

    created_at: datetime
    updated_at: datetime
    submitted_at: datetime | None
    reviewed_at: datetime | None


class PublicProfileResponse(BaseModel):
    user_id: int
    display_name: str
    major: str

    about_me: str | None
    interests: str | None
    favorite_quote: str | None

    background_style: str | None
    font_style: str | None

    songs: list[ProfileSongResponse]


class ProfileSubmitResponse(BaseModel):
    status: str
    message: str