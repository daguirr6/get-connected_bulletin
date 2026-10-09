"""add site activity tracking

Revision ID: b7d31a4f2c88
Revises: f0a512cb9b11
Create Date: 2026-10-08
"""

from typing import (
    Sequence,
    Union,
)

from alembic import op
import sqlalchemy as sa


revision: str = (
    "b7d31a4f2c88"
)

down_revision: Union[
    str,
    Sequence[str],
    None,
] = "f0a512cb9b11"

branch_labels: Union[
    str,
    Sequence[str],
    None,
] = None

depends_on: Union[
    str,
    Sequence[str],
    None,
] = None


def upgrade() -> None:
    op.create_table(
        "daily_site_activity",

        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "user_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "activity_date",
            sa.Date(),
            nullable=False,
        ),

        sa.Column(
            "first_seen_at",
            sa.DateTime(
                timezone=True
            ),
            nullable=False,
        ),

        sa.Column(
            "last_seen_at",
            sa.DateTime(
                timezone=True
            ),
            nullable=False,
        ),

        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),

        sa.PrimaryKeyConstraint(
            "id"
        ),

        sa.UniqueConstraint(
            "user_id",
            "activity_date",
            name=(
                "uq_daily_site_activity_"
                "user_date"
            ),
        ),
    )

    op.create_index(
        "ix_daily_site_activity_date",
        "daily_site_activity",
        ["activity_date"],
        unique=False,
    )

    op.create_table(
        "hourly_site_activity",

        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "user_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "activity_date",
            sa.Date(),
            nullable=False,
        ),

        sa.Column(
            "activity_hour",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "first_seen_at",
            sa.DateTime(
                timezone=True
            ),
            nullable=False,
        ),

        sa.Column(
            "last_seen_at",
            sa.DateTime(
                timezone=True
            ),
            nullable=False,
        ),

        sa.CheckConstraint(
            "activity_hour >= 0 "
            "AND activity_hour <= 23",
            name=(
                "ck_hourly_site_activity_"
                "valid_hour"
            ),
        ),

        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),

        sa.PrimaryKeyConstraint(
            "id"
        ),

        sa.UniqueConstraint(
            "user_id",
            "activity_date",
            "activity_hour",
            name=(
                "uq_hourly_site_activity_"
                "user_date_hour"
            ),
        ),
    )

    op.create_index(
        "ix_hourly_site_activity_date",
        "hourly_site_activity",
        ["activity_date"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_hourly_site_activity_date",
        table_name=(
            "hourly_site_activity"
        ),
    )

    op.drop_table(
        "hourly_site_activity"
    )

    op.drop_index(
        "ix_daily_site_activity_date",
        table_name=(
            "daily_site_activity"
        ),
    )

    op.drop_table(
        "daily_site_activity"
    )