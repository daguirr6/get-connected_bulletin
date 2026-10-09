"""add community interest metadata

Revision ID: d8f1a6c3e245
Revises: c4a2e9f7d611
Create Date: 2026-10-09
"""

import hashlib
import re
import unicodedata

from alembic import op
import sqlalchemy as sa


revision = "d8f1a6c3e245"
down_revision = "c4a2e9f7d611"
branch_labels = None
depends_on = None


COMMUNITY_CATEGORY = "Community Added"

ALIASES = {
    "video games": "Gaming",
    "videogames": "Gaming",
    "games": "Gaming",
    "game": "Gaming",
    "tabletop": "Tabletop RPGs",
    "dnd": "Tabletop RPGs",
    "d&d": "Tabletop RPGs",
    "tv": "TV Shows",
    "television": "TV Shows",
    "film": "Movies",
    "films": "Movies",
    "reading": "Books",
    "comic books": "Comics",
    "photos": "Photography",
    "film making": "Filmmaking",
    "film-making": "Filmmaking",
    "programming": "Coding",
    "computer programming": "Coding",
    "software development": "Coding",
    "ai": "AI & Machine Learning",
    "machine learning": "AI & Machine Learning",
    "cyber security": "Cybersecurity",
    "3d printing": "3D Printing",
    "3d-printing": "3D Printing",
    "birds": "Birdwatching",
    "bird watching": "Birdwatching",
    "birding": "Birdwatching",
    "fitness": "Gym & Fitness",
    "gym": "Gym & Fitness",
    "working out": "Gym & Fitness",
    "workout": "Gym & Fitness",
    "football": "Soccer",
    "clubs": "Clubs & Organizations",
    "student clubs": "Clubs & Organizations",
    "campus clubs": "Clubs & Organizations",
    "languages": "Language Learning",
}


def clean_interest_name(value):
    value = unicodedata.normalize(
        "NFKC",
        value,
    )

    return " ".join(
        value.strip().split()
    )


def normalize_interest_name(value):
    return clean_interest_name(
        value
    ).casefold()


def parse_legacy_interests(value):
    if not value:
        return []

    pieces = re.split(
        r"[,;\n]+",
        value,
    )

    return [
        clean_interest_name(piece)
        for piece in pieces
        if clean_interest_name(piece)
    ]


def valid_community_name(value):
    if len(value) < 2 or len(value) > 50:
        return False

    if not any(
        character.isalnum()
        for character in value
    ):
        return False

    return not any(
        unicodedata
        .category(character)
        .startswith("C")
        for character in value
    )


def make_community_slug(
    display_name,
    normalized_name,
):
    ascii_name = (
        unicodedata.normalize(
            "NFKD",
            display_name,
        )
        .encode(
            "ascii",
            "ignore",
        )
        .decode("ascii")
        .lower()
    )

    base = re.sub(
        r"[^a-z0-9]+",
        "-",
        ascii_name,
    ).strip("-")

    if not base:
        base = "interest"

    digest = hashlib.sha1(
        normalized_name.encode("utf-8")
    ).hexdigest()[:8]

    return (
        f"{base[:60]}-{digest}"
    )[:80]


def upgrade():
    op.add_column(
        "interests",
        sa.Column(
            "normalized_name",
            sa.String(length=100),
            nullable=True,
        ),
    )

    op.add_column(
        "interests",
        sa.Column(
            "is_community_created",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )

    op.add_column(
        "interests",
        sa.Column(
            "created_by_user_id",
            sa.Integer(),
            nullable=True,
        ),
    )

    op.create_foreign_key(
        "fk_interests_created_by_user_id_users",
        "interests",
        "users",
        ["created_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )

    bind = op.get_bind()

    interest_rows = bind.execute(
        sa.text(
            """
            SELECT
                id,
                name
            FROM interests
            ORDER BY id
            """
        )
    ).mappings().all()

    seen_normalized = set()

    for row in interest_rows:
        normalized = normalize_interest_name(
            row["name"]
        )

        if normalized in seen_normalized:
            raise RuntimeError(
                "Duplicate normalized interest names found"
            )

        seen_normalized.add(normalized)

        bind.execute(
            sa.text(
                """
                UPDATE interests
                SET normalized_name = :normalized_name
                WHERE id = :interest_id
                """
            ),
            {
                "normalized_name": normalized,
                "interest_id": row["id"],
            },
        )

    op.alter_column(
        "interests",
        "normalized_name",
        existing_type=sa.String(length=100),
        nullable=False,
    )

    op.create_unique_constraint(
        "uq_interests_normalized_name",
        "interests",
        ["normalized_name"],
    )

    interest_rows = bind.execute(
        sa.text(
            """
            SELECT
                id,
                name,
                normalized_name
            FROM interests
            """
        )
    ).mappings().all()

    by_normalized = {
        row["normalized_name"]: row
        for row in interest_rows
    }

    by_name = {
        row["name"]: row
        for row in interest_rows
    }

    profiles = bind.execute(
        sa.text(
            """
            SELECT
                id,
                user_id,
                interests
            FROM profiles
            WHERE interests IS NOT NULL
            ORDER BY id
            """
        )
    ).mappings().all()

    for profile in profiles:
        for legacy_item in parse_legacy_interests(
            profile["interests"]
        ):
            normalized = normalize_interest_name(
                legacy_item
            )

            interest_row = by_normalized.get(
                normalized
            )

            if interest_row is None:
                alias_name = ALIASES.get(
                    normalized
                )

                if alias_name is not None:
                    interest_row = by_name.get(
                        alias_name
                    )

            if (
                interest_row is None
                and valid_community_name(
                    legacy_item
                )
            ):
                slug = make_community_slug(
                    legacy_item,
                    normalized,
                )

                result = bind.execute(
                    sa.text(
                        """
                        INSERT INTO interests
                            (
                                name,
                                normalized_name,
                                slug,
                                category,
                                sort_order,
                                is_active,
                                is_community_created,
                                created_by_user_id
                            )
                        VALUES
                            (
                                :name,
                                :normalized_name,
                                :slug,
                                :category,
                                10000,
                                true,
                                true,
                                :created_by_user_id
                            )
                        ON CONFLICT (normalized_name)
                        DO NOTHING
                        RETURNING
                            id,
                            name,
                            normalized_name
                        """
                    ),
                    {
                        "name": legacy_item,
                        "normalized_name": normalized,
                        "slug": slug,
                        "category": COMMUNITY_CATEGORY,
                        "created_by_user_id":
                            profile["user_id"],
                    },
                ).mappings().first()

                if result is None:
                    result = bind.execute(
                        sa.text(
                            """
                            SELECT
                                id,
                                name,
                                normalized_name
                            FROM interests
                            WHERE normalized_name =
                                :normalized_name
                            """
                        ),
                        {
                            "normalized_name":
                                normalized,
                        },
                    ).mappings().first()

                interest_row = result

                if interest_row is not None:
                    by_normalized[
                        interest_row[
                            "normalized_name"
                        ]
                    ] = interest_row

                    by_name[
                        interest_row["name"]
                    ] = interest_row

            if interest_row is None:
                continue

            bind.execute(
                sa.text(
                    """
                    INSERT INTO profile_interests
                        (
                            profile_id,
                            interest_id
                        )
                    VALUES
                        (
                            :profile_id,
                            :interest_id
                        )
                    ON CONFLICT DO NOTHING
                    """
                ),
                {
                    "profile_id":
                        profile["id"],
                    "interest_id":
                        interest_row["id"],
                },
            )


def downgrade():
    op.drop_constraint(
        "uq_interests_normalized_name",
        "interests",
        type_="unique",
    )

    op.drop_constraint(
        "fk_interests_created_by_user_id_users",
        "interests",
        type_="foreignkey",
    )

    op.drop_column(
        "interests",
        "created_by_user_id",
    )

    op.drop_column(
        "interests",
        "is_community_created",
    )

    op.drop_column(
        "interests",
        "normalized_name",
    )