"""add changelog

Revision ID: a6e3c2d9f104
Revises: f2c8a4d7b901
Create Date: 2026-10-10
"""

from datetime import (
    datetime,
    timezone,
)

from alembic import op
import sqlalchemy as sa


revision = "a6e3c2d9f104"
down_revision = "f2c8a4d7b901"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "users",
        sa.Column(
            "last_seen_changelog_at",
            sa.DateTime(
                timezone=True
            ),
            nullable=True,
        ),
    )

    op.create_table(
        "changelog_entries",

        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True,
        ),

        sa.Column(
            "title",
            sa.String(
                length=120
            ),
            nullable=False,
        ),

        sa.Column(
            "category",
            sa.String(
                length=40
            ),
            nullable=False,
        ),

        sa.Column(
            "summary",
            sa.Text(),
            nullable=False,
        ),

        sa.Column(
            "published_at",
            sa.DateTime(
                timezone=True
            ),
            nullable=False,
        ),

        sa.Column(
            "sort_order",
            sa.Integer(),
            server_default=
                sa.text("0"),
            nullable=False,
        ),

        sa.Column(
            "is_published",
            sa.Boolean(),
            server_default=
                sa.true(),
            nullable=False,
        ),

        sa.Column(
            "created_at",
            sa.DateTime(
                timezone=True
            ),
            server_default=
                sa.func.now(),
            nullable=False,
        ),
    )

    op.create_index(
        "ix_changelog_entries_published_at",
        "changelog_entries",
        [
            "published_at",
        ],
    )

    changelog_entries = sa.table(
        "changelog_entries",

        sa.column(
            "title",
            sa.String,
        ),

        sa.column(
            "category",
            sa.String,
        ),

        sa.column(
            "summary",
            sa.Text,
        ),

        sa.column(
            "published_at",
            sa.DateTime(
                timezone=True
            ),
        ),

        sa.column(
            "sort_order",
            sa.Integer,
        ),

        sa.column(
            "is_published",
            sa.Boolean,
        ),
    )

    published_at = datetime(
        2026,
        10,
        10,
        16,
        0,
        tzinfo=timezone.utc,
    )

    op.bulk_insert(
        changelog_entries,
        [
            {
                "title":
                    "Better Connections",

                "category":
                    "DISCOVERY",

                "summary":
                    (
                        "Connection suggestions "
                        "now focus on "
                        "friends-of-friends who "
                        "also share interests "
                        "with you."
                    ),

                "published_at":
                    published_at,

                "sort_order":
                    10,

                "is_published":
                    True,
            },

            {
                "title":
                    "More Ways To Be You",

                "category":
                    "PROFILE",

                "summary":
                    (
                        "Profiles now have "
                        "another way to show "
                        "the interests and "
                        "little things that "
                        "make you, you."
                    ),

                "published_at":
                    published_at,

                "sort_order":
                    20,

                "is_published":
                    True,
            },

            {
                "title":
                    "More Interests",

                "category":
                    "INTERESTS",

                "summary":
                    (
                        "You can now choose "
                        "more interests, use a "
                        "cleaner interest "
                        "browser, and add new "
                        "interests to the "
                        "community catalog."
                    ),

                "published_at":
                    published_at,

                "sort_order":
                    30,

                "is_published":
                    True,
            },

            {
                "title":
                    "What's New",

                "category":
                    "SITE",

                "summary":
                    (
                        "A new What's New area "
                        "makes it easier to see "
                        "recent Get Connected "
                        "improvements."
                    ),

                "published_at":
                    published_at,

                "sort_order":
                    40,

                "is_published":
                    True,
            },
        ],
    )


def downgrade():
    op.drop_index(
        "ix_changelog_entries_published_at",
        table_name=
            "changelog_entries",
    )

    op.drop_table(
        "changelog_entries"
    )

    op.drop_column(
        "users",
        "last_seen_changelog_at",
    )