from datetime import datetime

from pydantic import BaseModel, Field


class PostItCreate(BaseModel):
    display_name: str = Field(min_length=1, max_length=80)
    fun_facts: str = Field(min_length=1, max_length=1000)
    song_title: str = Field(min_length=1, max_length=150)
    song_artist: str | None = Field(default=None, max_length=150)


class PostItUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=80)
    fun_facts: str | None = Field(default=None, min_length=1, max_length=1000)
    song_title: str | None = Field(default=None, min_length=1, max_length=150)
    song_artist: str | None = Field(default=None, max_length=150)


class PostItResponse(BaseModel):
    id: int
    user_id: int
    display_name: str
    major: str
    fun_facts: str
    song_title: str
    song_artist: str | None
    created_at: datetime