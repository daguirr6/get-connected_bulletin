"""add profile identity items

Revision ID: f2c8a4d7b901
Revises: d8f1a6c3e245
Create Date: 2026-10-10
"""

from alembic import op
import sqlalchemy as sa


revision = "f2c8a4d7b901"
down_revision = "d8f1a6c3e245"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "profiles",
        sa.Column(
            "identity_items",
            sa.JSON(),
            nullable=False,
            server_default=sa.text(
                "'[]'::json"
            ),
        ),
    )

    op.alter_column(
        "profiles",
        "identity_items",
        server_default=None,
    )


def downgrade():
    op.drop_column(
        "profiles",
        "identity_items",
    )