from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.block import Block
from backend.app.models.user import User
from backend.app.routes.auth import require_verified_user
from backend.app.schemas.block import (
    BlockCreate,
    BlockResponse,
)


router = APIRouter(
    prefix="/blocks",
    tags=["Blocks"],
)


@router.post(
    "/{target_user_id}",
    response_model=BlockResponse,
    status_code=status.HTTP_201_CREATED,
)
def block_user(
    target_user_id: int,
    data: BlockCreate,
    user: User = Depends(require_verified_user),
    db: Session = Depends(get_db),
):
    if target_user_id == user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot block yourself",
        )

    target_user = db.get(
        User,
        target_user_id,
    )

    if (
        target_user is None
        or target_user.account_status != "active"
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    existing_block = db.scalar(
        select(Block).where(
            Block.blocker_id == user.id,
            Block.blocked_id == target_user_id,
        )
    )

    if existing_block is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already blocked",
        )

    reason = data.reason.strip()

    if len(reason) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a reason for blocking this user",
        )

    block = Block(
        blocker_id=user.id,
        blocked_id=target_user_id,
        reason=reason,
    )

    db.add(block)
    db.commit()
    db.refresh(block)

    return BlockResponse(
        id=block.id,
        blocked_user_id=target_user.id,
        username=target_user.username,
        reason=block.reason,
        created_at=block.created_at,
    )


@router.get(
    "",
    response_model=list[BlockResponse],
)
def get_my_blocks(
    user: User = Depends(require_verified_user),
    db: Session = Depends(get_db),
):
    blocks = db.scalars(
        select(Block)
        .where(
            Block.blocker_id == user.id
        )
        .order_by(
            Block.created_at.desc()
        )
    ).all()

    results = []

    for block in blocks:
        blocked_user = db.get(
            User,
            block.blocked_id,
        )

        if blocked_user is None:
            continue

        results.append(
            BlockResponse(
                id=block.id,
                blocked_user_id=blocked_user.id,
                username=blocked_user.username,
                reason=block.reason,
                created_at=block.created_at,
            )
        )

    return results


@router.delete(
    "/{target_user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def unblock_user(
    target_user_id: int,
    user: User = Depends(require_verified_user),
    db: Session = Depends(get_db),
):
    block = db.scalar(
        select(Block).where(
            Block.blocker_id == user.id,
            Block.blocked_id == target_user_id,
        )
    )

    if block is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Block not found",
        )

    db.delete(block)
    db.commit()