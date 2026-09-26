from datetime import datetime

from pydantic import BaseModel, Field


class ProfileUpdate(BaseModel):
    about_me: str | None = Field(default=None, max_length=5000)
    interests: str | None = Field(default=None, max_length=2000)
    favorite_quote: str | None = Field(default=None, max_length=500)
    background_style: str | None = Field(default=None, max_length=100)
    font_style: str | None = Field(default=None, max_length=100)


class ProfileResponse(BaseModel):
    id: int
    user_id: int
    about_me: str | None
    interests: str | None
    favorite_quote: str | None
    background_style: str | None
    font_style: str | None
    status: str
    admin_note: str | None
    created_at: datetime
    updated_at: datetime
    submitted_at: datetime | None
    reviewed_at: datetime | None


class PublicProfileResponse(BaseModel):
    user_id: int
    about_me: str | None
    interests: str | None
    favorite_quote: str | None
    background_style: str | None
    font_style: str | None


class ProfileSubmitResponse(BaseModel):
    status: str
    message: str