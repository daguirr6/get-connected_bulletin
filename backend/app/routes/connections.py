from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.connection import Connection
from backend.app.models.post_it import PostIt
from backend.app.models.user import User
from backend.app.models.verification import VerificationRequest
from backend.app.routes.auth import require_verified_user
from backend.app.schemas.connection import ConnectionResponse


router = APIRouter(
    prefix="/connections",
    tags=["Connections"],
)


@router.post(
    "/{target_user_id}",
    response_model=ConnectionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_connection(
    target_user_id: int,
    user: User = Depends(require_verified_user),
    db: Session = Depends(get_db),
):
    my_post_it = db.scalar(
        select(PostIt).where(PostIt.user_id == user.id)
    )

    if my_post_it is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Create a Post-it before connecting with others",
        )

    if target_user_id == user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot connect with yourself",
        )

    target_user = db.get(User, target_user_id)

    if target_user is None or target_user.verification_status != "verified":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    target_post_it = db.scalar(
        select(PostIt).where(PostIt.user_id == target_user_id)
    )

    if target_post_it is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User does not have a Post-it",
        )

    user_one_id = min(user.id, target_user_id)
    user_two_id = max(user.id, target_user_id)

    existing_connection = db.scalar(
        select(Connection).where(
            Connection.user_one_id == user_one_id,
            Connection.user_two_id == user_two_id,
        )
    )

    if existing_connection:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are already connected",
        )

    connection = Connection(
        user_one_id=user_one_id,
        user_two_id=user_two_id,
    )

    db.add(connection)
    db.commit()
    db.refresh(connection)

    verification = db.scalar(
        select(VerificationRequest).where(
            VerificationRequest.user_id == target_user_id
        )
    )

    return ConnectionResponse(
        id=connection.id,
        user_id=target_user.id,
        display_name=target_post_it.display_name,
        major=verification.major,
        connected_at=connection.created_at,
    )


@router.get(
    "",
    response_model=list[ConnectionResponse],
)
def get_connections(
    user: User = Depends(require_verified_user),
    db: Session = Depends(get_db),
):
    connections = db.scalars(
        select(Connection)
        .where(
            or_(
                Connection.user_one_id == user.id,
                Connection.user_two_id == user.id,
            )
        )
        .order_by(Connection.created_at.desc())
    ).all()

    results = []

    for connection in connections:
        if connection.user_one_id == user.id:
            other_user_id = connection.user_two_id
        else:
            other_user_id = connection.user_one_id

        post_it = db.scalar(
            select(PostIt).where(PostIt.user_id == other_user_id)
        )

        verification = db.scalar(
            select(VerificationRequest).where(
                VerificationRequest.user_id == other_user_id
            )
        )

        if post_it is None or verification is None:
            continue

        results.append(
            ConnectionResponse(
                id=connection.id,
                user_id=other_user_id,
                display_name=post_it.display_name,
                major=verification.major,
                connected_at=connection.created_at,
            )
        )

    return results