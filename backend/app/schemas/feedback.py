from typing import Literal

from pydantic import BaseModel, Field


FeedbackArea = Literal[
    "bulletin",
    "connections",
    "chats",
    "profiles",
    "post_it",
    "verification",
    "safety_appeals",
    "mobile_layout",
    "other",
]


FeedbackTopic = Literal[
    "bug",
    "suggestion",
    "design",
    "safety",
    "accessibility",
    "other",
]


class FeedbackCreate(BaseModel):
    area: FeedbackArea

    topic: FeedbackTopic

    message: str = Field(
        min_length=10,
        max_length=5000,
    )

    include_username: bool = False


class FeedbackResponse(BaseModel):
    message: str