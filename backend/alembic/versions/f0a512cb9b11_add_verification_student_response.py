"""Add student verification response"""
from alembic import op
import sqlalchemy as sa

revision = "f0a512cb9b11"
down_revision = "169a5488c957"
branch_labels = None
depends_on = None

def upgrade():
    op.add_column("verification_requests", sa.Column("student_response", sa.Text(), nullable=True))

def downgrade():
    op.drop_column("verification_requests", "student_response")
