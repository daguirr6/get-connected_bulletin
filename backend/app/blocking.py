from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.models.block import Block


def has_blocked(
    db: Session,
    blocker_id: int,
    blocked_id: int,
) -> bool:
    block_id = db.scalar(
        select(Block.id).where(
            Block.blocker_id == blocker_id,
            Block.blocked_id == blocked_id,
        )
    )

    return block_id is not None