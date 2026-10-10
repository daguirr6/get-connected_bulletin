from datetime import datetime
from typing import Literal

from pydantic import (
    BaseModel,
    Field,
    field_validator,
)

from backend.app.schemas.moderation import (
    PublicModerationNotice,
)


MAX_IDENTITY_ITEMS = 10
MAX_IDENTITY_ITEM_LENGTH = 60


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


ClassYear = Literal[
    "freshman",
    "sophomore",
    "junior",
    "senior",
    "graduate",
    "other",
    "prefer_not_to_say",
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

    identity_items: list[str] | None = Field(
        default=None,
        max_length=MAX_IDENTITY_ITEMS,
    )

    favorite_quote: str | None = Field(
        default=None,
        max_length=500,
    )

    class_year: ClassYear | None = None

    aspiration: str | None = Field(
        default=None,
        max_length=255,
    )

    looking_for: str | None = Field(
        default=None,
        max_length=2000,
    )

    ask_me_about: str | None = Field(
        default=None,
        max_length=2000,
    )

    current_obsession: str | None = Field(
        default=None,
        max_length=500,
    )

    background_style: BackgroundStyle | None = None
    font_style: FontStyle | None = None

    @field_validator(
        "identity_items"
    )
    @classmethod
    def validate_identity_items(
        cls,
        items: list[str] | None,
    ) -> list[str] | None:
        if items is None:
            return None

        cleaned_items = []
        seen = set()

        for item in items:
            cleaned = " ".join(
                item.strip().split()
            )

            if not cleaned:
                raise ValueError(
                    "Identity items cannot be blank"
                )

            if (
                len(cleaned)
                > MAX_IDENTITY_ITEM_LENGTH
            ):
                raise ValueError(
                    "Identity items must be "
                    f"{MAX_IDENTITY_ITEM_LENGTH} "
                    "characters or shorter"
                )

            normalized = (
                cleaned.casefold()
            )

            if normalized in seen:
                raise ValueError(
                    "Identity items cannot contain duplicates"
                )

            seen.add(normalized)

            cleaned_items.append(
                cleaned
            )

        return cleaned_items


class ProfileResponse(BaseModel):
    id: int
    user_id: int

    about_me: str | None
    interests: str | None
    identity_items: list[str]
    favorite_quote: str | None

    class_year: str | None
    aspiration: str | None
    looking_for: str | None
    ask_me_about: str | None
    current_obsession: str | None

    background_style: str | None
    font_style: str | None
    profile_picture_url: str | None

    songs: list[ProfileSongResponse]

    status: str
    admin_note: str | None

    created_at: datetime
    updated_at: datetime
    submitted_at: datetime | None
    reviewed_at: datetime | None


class PublicProfileResponse(BaseModel):
    moderation: PublicModerationNotice

    user_id: int
    display_name: str
    major: str

    about_me: str | None
    interests: str | None
    identity_items: list[str]
    favorite_quote: str | None

    class_year: str | None
    aspiration: str | None
    looking_for: str | None
    ask_me_about: str | None
    current_obsession: str | None

    background_style: str | None
    font_style: str | None
    profile_picture_url: str | None

    songs: list[ProfileSongResponse]


class ProfileSubmitResponse(BaseModel):
    status: str
    message: str