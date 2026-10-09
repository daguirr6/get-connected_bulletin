from datetime import date, datetime

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    UniqueConstraint,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from backend.app.models.base import Base


class DailySiteActivity(Base):
    __tablename__ = (
        "daily_site_activity"
    )

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    activity_date: Mapped[date] = (
        mapped_column(
            Date,
            nullable=False,
        )
    )

    first_seen_at: Mapped[
        datetime
    ] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    last_seen_at: Mapped[
        datetime
    ] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "activity_date",
            name=(
                "uq_daily_site_activity_"
                "user_date"
            ),
        ),

        Index(
            "ix_daily_site_activity_date",
            "activity_date",
        ),
    )


class HourlySiteActivity(Base):
    __tablename__ = (
        "hourly_site_activity"
    )

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    activity_date: Mapped[date] = (
        mapped_column(
            Date,
            nullable=False,
        )
    )

    activity_hour: Mapped[int] = (
        mapped_column(
            Integer,
            nullable=False,
        )
    )

    first_seen_at: Mapped[
        datetime
    ] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    last_seen_at: Mapped[
        datetime
    ] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "activity_date",
            "activity_hour",
            name=(
                "uq_hourly_site_activity_"
                "user_date_hour"
            ),
        ),

        CheckConstraint(
            "activity_hour >= 0 "
            "AND activity_hour <= 23",
            name=(
                "ck_hourly_site_activity_"
                "valid_hour"
            ),
        ),

        Index(
            "ix_hourly_site_activity_date",
            "activity_date",
        ),
    )