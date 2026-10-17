"""backfill changelog history

Revision ID: d067eae51fdb
Revises: a6e3c2d9f104
Create Date: 2026-10-17
"""

from datetime import (
    datetime,
    timezone,
)

from alembic import op
import sqlalchemy as sa


revision = "d067eae51fdb"
down_revision = "a6e3c2d9f104"
branch_labels = None
depends_on = None


def get_changelog_table():
    return sa.table(
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


def published_date(
    year,
    month,
    day,
):
    return datetime(
        year,
        month,
        day,
        16,
        0,
        tzinfo=timezone.utc,
    )


def upgrade():
    changelog_entries = (
        get_changelog_table()
    )

    connection = op.get_bind()

    old_titles = [
        "Better Connections",
        "More Ways To Be You",
        "More Interests",
        "What's New",
    ]

    history_titles = [
        "A Better Welcome",
        (
            "Profiles, Safety & "
            "Bulletin Improvements"
        ),
        "Verification Improvements",
        (
            "Sign-Up & Account "
            "Improvements"
        ),
        "Get Connected V2",
        "Better Chats",
        (
            "Profiles, Music & "
            "Navigation Improvements"
        ),
        (
            "Account & Site "
            "Improvements"
        ),
        "Shared Interests",
        (
            "Better Connections & "
            "More Personal Profiles"
        ),
    ]

    connection.execute(
        sa.delete(
            changelog_entries
        ).where(
            changelog_entries
            .c
            .title
            .in_(
                old_titles
                + history_titles
            )
        )
    )

    op.bulk_insert(
        changelog_entries,
        [
            {
                "title":
                    "A Better Welcome",

                "category":
                    "WELCOME",

                "summary":
                    (
                        "Verification got a "
                        "more welcoming "
                        "experience, including "
                        "a celebration when "
                        "your account is "
                        "approved."
                    ),

                "published_at":
                    published_date(
                        2026,
                        9,
                        28,
                    ),

                "sort_order":
                    10,

                "is_published":
                    True,
            },

            {
                "title":
                    (
                        "Profiles, Safety & "
                        "Bulletin Improvements"
                    ),

                "category":
                    "COMMUNITY",

                "summary":
                    (
                        "Student profiles "
                        "arrived with interests, "
                        "quotes, music, pictures, "
                        "and customization. "
                        "Safety tools like "
                        "blocking, reporting, "
                        "appeals, and privacy "
                        "information were added. "
                        "The bulletin board also "
                        "received colorful "
                        "Post-its and new ways "
                        "to discover other "
                        "students."
                    ),

                "published_at":
                    published_date(
                        2026,
                        9,
                        29,
                    ),

                "sort_order":
                    10,

                "is_published":
                    True,
            },

            {
                "title":
                    (
                        "Verification "
                        "Improvements"
                    ),

                "category":
                    "VERIFICATION",

                "summary":
                    (
                        "Verification became "
                        "easier to follow with "
                        "clearer status updates "
                        "and a smoother welcome "
                        "after approval."
                    ),

                "published_at":
                    published_date(
                        2026,
                        9,
                        30,
                    ),

                "sort_order":
                    10,

                "is_published":
                    True,
            },

            {
                "title":
                    (
                        "Sign-Up & Account "
                        "Improvements"
                    ),

                "category":
                    "ACCOUNT",

                "summary":
                    (
                        "Registration and "
                        "student verification "
                        "became clearer and "
                        "easier to use. Account "
                        "management was also "
                        "expanded, along with "
                        "several general site "
                        "improvements."
                    ),

                "published_at":
                    published_date(
                        2026,
                        10,
                        2,
                    ),

                "sort_order":
                    10,

                "is_published":
                    True,
            },

            {
                "title":
                    "Get Connected V2",

                "category":
                    "SITE",

                "summary":
                    (
                        "A refreshed version of "
                        "Get Connected arrived "
                        "with updated navigation, "
                        "a cleaner design, site-"
                        "wide improvements, a "
                        "new Feedback system, "
                        "and easier access to "
                        "important site "
                        "information."
                    ),

                "published_at":
                    published_date(
                        2026,
                        10,
                        3,
                    ),

                "sort_order":
                    10,

                "is_published":
                    True,
            },

            {
                "title":
                    "Better Chats",

                "category":
                    "CHAT",

                "summary":
                    (
                        "Messaging became "
                        "smoother with improved "
                        "navigation, presence "
                        "information, and a more "
                        "polished chat "
                        "experience."
                    ),

                "published_at":
                    published_date(
                        2026,
                        10,
                        4,
                    ),

                "sort_order":
                    10,

                "is_published":
                    True,
            },

            {
                "title":
                    (
                        "Profiles, Music & "
                        "Navigation Improvements"
                    ),

                "category":
                    "PROFILE",

                "summary":
                    (
                        "Profiles, music, "
                        "verification, and site "
                        "navigation received "
                        "another round of fixes "
                        "and polish."
                    ),

                "published_at":
                    published_date(
                        2026,
                        10,
                        6,
                    ),

                "sort_order":
                    10,

                "is_published":
                    True,
            },

            {
                "title":
                    (
                        "Account & Site "
                        "Improvements"
                    ),

                "category":
                    "SITE",

                "summary":
                    (
                        "Registration, account "
                        "management, admin tools, "
                        "and site activity "
                        "features received "
                        "another round of "
                        "improvements."
                    ),

                "published_at":
                    published_date(
                        2026,
                        10,
                        8,
                    ),

                "sort_order":
                    10,

                "is_published":
                    True,
            },

            {
                "title":
                    "Shared Interests",

                "category":
                    "INTERESTS",

                "summary":
                    (
                        "Interests became part "
                        "of a shared community "
                        "catalog, making it "
                        "easier to discover "
                        "students who enjoy "
                        "similar things."
                    ),

                "published_at":
                    published_date(
                        2026,
                        10,
                        9,
                    ),

                "sort_order":
                    10,

                "is_published":
                    True,
            },

            {
                "title":
                    (
                        "Better Connections & "
                        "More Personal Profiles"
                    ),

                "category":
                    "DISCOVERY",

                "summary":
                    (
                        "Connection suggestions "
                        "now focus more on "
                        "friends-of-friends who "
                        "share interests with "
                        "you. Profiles gained "
                        "the \"isn't themselves "
                        "without...\" section, "
                        "students can choose up "
                        "to 25 interests, new "
                        "community interests can "
                        "be added, and the new "
                        "What's New area was "
                        "introduced."
                    ),

                "published_at":
                    published_date(
                        2026,
                        10,
                        10,
                    ),

                "sort_order":
                    10,

                "is_published":
                    True,
            },
        ],
    )


def downgrade():
    changelog_entries = (
        get_changelog_table()
    )

    connection = op.get_bind()

    history_titles = [
        "A Better Welcome",
        (
            "Profiles, Safety & "
            "Bulletin Improvements"
        ),
        "Verification Improvements",
        (
            "Sign-Up & Account "
            "Improvements"
        ),
        "Get Connected V2",
        "Better Chats",
        (
            "Profiles, Music & "
            "Navigation Improvements"
        ),
        (
            "Account & Site "
            "Improvements"
        ),
        "Shared Interests",
        (
            "Better Connections & "
            "More Personal Profiles"
        ),
    ]

    connection.execute(
        sa.delete(
            changelog_entries
        ).where(
            changelog_entries
            .c
            .title
            .in_(
                history_titles
            )
        )
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