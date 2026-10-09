"""add structured interests

Revision ID: c4a2e9f7d611
Revises: b7d31a4f2c88
Create Date: 2026-10-09
"""

import re

from alembic import op
import sqlalchemy as sa


revision = "c4a2e9f7d611"
down_revision = "b7d31a4f2c88"
branch_labels = None
depends_on = None


STARTER_INTERESTS = [
    {
        "name": "Gaming",
        "slug": "gaming",
        "category": "Games",
        "sort_order": 10,
    },
    {
        "name": "Board Games",
        "slug": "board-games",
        "category": "Games",
        "sort_order": 20,
    },
    {
        "name": "Tabletop RPGs",
        "slug": "tabletop-rpgs",
        "category": "Games",
        "sort_order": 30,
    },
    {
        "name": "Esports",
        "slug": "esports",
        "category": "Games",
        "sort_order": 40,
    },
    {
        "name": "Anime",
        "slug": "anime",
        "category": "Entertainment",
        "sort_order": 50,
    },
    {
        "name": "Manga",
        "slug": "manga",
        "category": "Entertainment",
        "sort_order": 60,
    },
    {
        "name": "Movies",
        "slug": "movies",
        "category": "Entertainment",
        "sort_order": 70,
    },
    {
        "name": "TV Shows",
        "slug": "tv-shows",
        "category": "Entertainment",
        "sort_order": 80,
    },
    {
        "name": "Books",
        "slug": "books",
        "category": "Entertainment",
        "sort_order": 90,
    },
    {
        "name": "Comics",
        "slug": "comics",
        "category": "Entertainment",
        "sort_order": 100,
    },
    {
        "name": "Music",
        "slug": "music",
        "category": "Creative",
        "sort_order": 110,
    },
    {
        "name": "Singing",
        "slug": "singing",
        "category": "Creative",
        "sort_order": 120,
    },
    {
        "name": "Dance",
        "slug": "dance",
        "category": "Creative",
        "sort_order": 130,
    },
    {
        "name": "Art",
        "slug": "art",
        "category": "Creative",
        "sort_order": 140,
    },
    {
        "name": "Drawing",
        "slug": "drawing",
        "category": "Creative",
        "sort_order": 150,
    },
    {
        "name": "Photography",
        "slug": "photography",
        "category": "Creative",
        "sort_order": 160,
    },
    {
        "name": "Filmmaking",
        "slug": "filmmaking",
        "category": "Creative",
        "sort_order": 170,
    },
    {
        "name": "Writing",
        "slug": "writing",
        "category": "Creative",
        "sort_order": 180,
    },
    {
        "name": "Cosplay",
        "slug": "cosplay",
        "category": "Creative",
        "sort_order": 190,
    },
    {
        "name": "3D Printing",
        "slug": "3d-printing",
        "category": "Creative",
        "sort_order": 200,
    },
    {
        "name": "Coding",
        "slug": "coding",
        "category": "Technology",
        "sort_order": 210,
    },
    {
        "name": "Engineering",
        "slug": "engineering",
        "category": "Technology",
        "sort_order": 220,
    },
    {
        "name": "AI & Machine Learning",
        "slug": "ai-machine-learning",
        "category": "Technology",
        "sort_order": 230,
    },
    {
        "name": "Cybersecurity",
        "slug": "cybersecurity",
        "category": "Technology",
        "sort_order": 240,
    },
    {
        "name": "Robotics",
        "slug": "robotics",
        "category": "Technology",
        "sort_order": 250,
    },
    {
        "name": "Game Development",
        "slug": "game-development",
        "category": "Technology",
        "sort_order": 260,
    },
    {
        "name": "Birdwatching",
        "slug": "birdwatching",
        "category": "Outdoors",
        "sort_order": 270,
    },
    {
        "name": "Hiking",
        "slug": "hiking",
        "category": "Outdoors",
        "sort_order": 280,
    },
    {
        "name": "Camping",
        "slug": "camping",
        "category": "Outdoors",
        "sort_order": 290,
    },
    {
        "name": "Cycling",
        "slug": "cycling",
        "category": "Outdoors",
        "sort_order": 300,
    },
    {
        "name": "Running",
        "slug": "running",
        "category": "Fitness",
        "sort_order": 310,
    },
    {
        "name": "Gym & Fitness",
        "slug": "gym-fitness",
        "category": "Fitness",
        "sort_order": 320,
    },
    {
        "name": "Basketball",
        "slug": "basketball",
        "category": "Sports",
        "sort_order": 330,
    },
    {
        "name": "Soccer",
        "slug": "soccer",
        "category": "Sports",
        "sort_order": 340,
    },
    {
        "name": "Volleyball",
        "slug": "volleyball",
        "category": "Sports",
        "sort_order": 350,
    },
    {
        "name": "Swimming",
        "slug": "swimming",
        "category": "Sports",
        "sort_order": 360,
    },
    {
        "name": "Cooking",
        "slug": "cooking",
        "category": "Food",
        "sort_order": 370,
    },
    {
        "name": "Baking",
        "slug": "baking",
        "category": "Food",
        "sort_order": 380,
    },
    {
        "name": "Coffee",
        "slug": "coffee",
        "category": "Food",
        "sort_order": 390,
    },
    {
        "name": "Foodie",
        "slug": "foodie",
        "category": "Food",
        "sort_order": 400,
    },
    {
        "name": "Campus Events",
        "slug": "campus-events",
        "category": "Campus",
        "sort_order": 410,
    },
    {
        "name": "Clubs & Organizations",
        "slug": "clubs-organizations",
        "category": "Campus",
        "sort_order": 420,
    },
    {
        "name": "Volunteering",
        "slug": "volunteering",
        "category": "Campus",
        "sort_order": 430,
    },
    {
        "name": "Travel",
        "slug": "travel",
        "category": "Lifestyle",
        "sort_order": 440,
    },
    {
        "name": "Language Learning",
        "slug": "language-learning",
        "category": "Lifestyle",
        "sort_order": 450,
    },
]


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
    "photography": "Photography",
    "photos": "Photography",
    "film making": "Filmmaking",
    "film-making": "Filmmaking",
    "coding": "Coding",
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


def normalize_interest(value):
    return " ".join(
        value.casefold().strip().split()
    )


def parse_legacy_interests(value):
    if not value:
        return []

    pieces = re.split(
        r"[,;\n]+",
        value,
    )

    return [
        " ".join(piece.strip().split())
        for piece in pieces
        if piece.strip()
    ]


def upgrade():
    op.create_table(
        "interests",
        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True,
        ),
        sa.Column(
            "name",
            sa.String(length=80),
            nullable=False,
        ),
        sa.Column(
            "slug",
            sa.String(length=80),
            nullable=False,
        ),
        sa.Column(
            "category",
            sa.String(length=50),
            nullable=False,
        ),
        sa.Column(
            "sort_order",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint(
            "name",
            name="uq_interests_name",
        ),
        sa.UniqueConstraint(
            "slug",
            name="uq_interests_slug",
        ),
    )

    op.create_index(
        "ix_interests_category",
        "interests",
        ["category"],
        unique=False,
    )

    op.create_index(
        "ix_interests_active_sort",
        "interests",
        [
            "is_active",
            "sort_order",
        ],
        unique=False,
    )

    op.create_table(
        "profile_interests",
        sa.Column(
            "profile_id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "interest_id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(
            ["profile_id"],
            ["profiles.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["interest_id"],
            ["interests.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint(
            "profile_id",
            "interest_id",
            name="pk_profile_interests",
        ),
    )

    op.create_index(
        "ix_profile_interests_interest_id",
        "profile_interests",
        ["interest_id"],
        unique=False,
    )

    bind = op.get_bind()

    bind.execute(
        sa.text(
            """
            INSERT INTO interests
                (
                    name,
                    slug,
                    category,
                    sort_order,
                    is_active
                )
            VALUES
                (
                    :name,
                    :slug,
                    :category,
                    :sort_order,
                    true
                )
            """
        ),
        STARTER_INTERESTS,
    )

    interest_rows = bind.execute(
        sa.text(
            """
            SELECT
                id,
                name
            FROM interests
            """
        )
    ).mappings().all()

    interests_by_name = {
        normalize_interest(row["name"]):
            row["id"]
        for row in interest_rows
    }

    canonical_names = {
        normalize_interest(item["name"]):
            item["name"]
        for item in STARTER_INTERESTS
    }

    profiles = bind.execute(
        sa.text(
            """
            SELECT
                id,
                interests
            FROM profiles
            WHERE interests IS NOT NULL
            """
        )
    ).mappings().all()

    links = set()

    for profile in profiles:
        legacy_items = parse_legacy_interests(
            profile["interests"]
        )

        for legacy_item in legacy_items:
            normalized = normalize_interest(
                legacy_item
            )

            canonical_name = (
                canonical_names.get(
                    normalized
                )
                or ALIASES.get(
                    normalized
                )
            )

            if canonical_name is None:
                continue

            interest_id = interests_by_name.get(
                normalize_interest(
                    canonical_name
                )
            )

            if interest_id is None:
                continue

            links.add(
                (
                    profile["id"],
                    interest_id,
                )
            )

    if links:
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
            [
                {
                    "profile_id":
                        profile_id,
                    "interest_id":
                        interest_id,
                }
                for (
                    profile_id,
                    interest_id,
                ) in sorted(links)
            ],
        )


def downgrade():
    op.drop_index(
        "ix_profile_interests_interest_id",
        table_name="profile_interests",
    )

    op.drop_table(
        "profile_interests"
    )

    op.drop_index(
        "ix_interests_active_sort",
        table_name="interests",
    )

    op.drop_index(
        "ix_interests_category",
        table_name="interests",
    )

    op.drop_table(
        "interests"
    )