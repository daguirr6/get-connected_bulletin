from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.models.base import Base


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        unique=True,
        nullable=False,
    )

    about_me: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    interests: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    favorite_quote: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    class_year: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    aspiration: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    looking_for: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    ask_me_about: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    current_obsession: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    background_style: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    font_style: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    profile_picture: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        default="draft",
        nullable=False,
    )

    admin_note: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    submitted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )