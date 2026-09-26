from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.connection import Connection
from backend.app.models.message import Message
from backend.app.models.post_it import PostIt
from backend.app.models.user import User
from backend.app.models.verification import VerificationRequest
from backend.app.routes.auth import require_verified_user
from backend.app.schemas.chat import (
    ChatSummaryResponse,
    MarkReadResponse,
    MessageCreate,
    MessageResponse,
)


router = APIRouter(
    prefix="/chats",
    tags=["Chats"],
)


def get_user_connection(
    connection_id: int,
    user: User,
    db: Session,
):
    connection = db.get(Connection, connection_id)

    if connection is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found",
        )

    belongs_to_user = (
        connection.user_one_id == user.id
        or connection.user_two_id == user.id
    )

    if not belongs_to_user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this chat",
        )

    return connection


@router.get(
    "",
    response_model=list[ChatSummaryResponse],
)
def get_chats(
    user: User = Depends(require_verified_user),
    db: Session = Depends(get_db),
):
    connections = db.scalars(
        select(Connection).where(
            or_(
                Connection.user_one_id == user.id,
                Connection.user_two_id == user.id,
            )
        )
    ).all()

    chats = []

    for connection in connections:
        if connection.user_one_id == user.id:
            other_user_id = connection.user_two_id
        else:
            other_user_id = connection.user_one_id

        other_user = db.get(User, other_user_id)

        if other_user is None:
            continue

        if other_user.verification_status != "verified":
            continue

        post_it = db.scalar(
            select(PostIt).where(
                PostIt.user_id == other_user_id
            )
        )

        verification = db.scalar(
            select(VerificationRequest).where(
                VerificationRequest.user_id == other_user_id
            )
        )

        if post_it is None or verification is None:
            continue

        last_message = db.scalar(
            select(Message)
            .where(
                Message.connection_id == connection.id
            )
            .order_by(Message.created_at.desc())
            .limit(1)
        )

        unread_count = db.scalar(
            select(func.count(Message.id)).where(
                Message.connection_id == connection.id,
                Message.sender_id != user.id,
                Message.read_at.is_(None),
            )
        )

        chats.append(
            ChatSummaryResponse(
                connection_id=connection.id,
                user_id=other_user_id,
                display_name=post_it.display_name,
                major=verification.major,
                last_message=(
                    last_message.content
                    if last_message
                    else None
                ),
                last_sender_id=(
                    last_message.sender_id
                    if last_message
                    else None
                ),
                last_message_at=(
                    last_message.created_at
                    if last_message
                    else None
                ),
                unread_count=unread_count or 0,
            )
        )

    chats.sort(
        key=lambda chat: (
            chat.last_message_at is not None,
            chat.last_message_at,
        ),
        reverse=True,
    )

    return chats


@router.post(
    "/{connection_id}/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
)
def send_message(
    connection_id: int,
    data: MessageCreate,
    user: User = Depends(require_verified_user),
    db: Session = Depends(get_db),
):
    get_user_connection(connection_id, user, db)

    content = data.content.strip()

    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message cannot be empty",
        )

    message = Message(
        connection_id=connection_id,
        sender_id=user.id,
        content=content,
    )

    db.add(message)
    db.commit()
    db.refresh(message)

    return MessageResponse(
        id=message.id,
        connection_id=message.connection_id,
        sender_id=message.sender_id,
        content=message.content,
        created_at=message.created_at,
        read_at=message.read_at,
    )


@router.get(
    "/{connection_id}/messages",
    response_model=list[MessageResponse],
)
def get_messages(
    connection_id: int,
    user: User = Depends(require_verified_user),
    db: Session = Depends(get_db),
):
    get_user_connection(connection_id, user, db)

    messages = db.scalars(
        select(Message)
        .where(Message.connection_id == connection_id)
        .order_by(Message.created_at)
    ).all()

    return [
        MessageResponse(
            id=message.id,
            connection_id=message.connection_id,
            sender_id=message.sender_id,
            content=message.content,
            created_at=message.created_at,
            read_at=message.read_at,
        )
        for message in messages
    ]


@router.patch(
    "/{connection_id}/read",
    response_model=MarkReadResponse,
)
def mark_chat_read(
    connection_id: int,
    user: User = Depends(require_verified_user),
    db: Session = Depends(get_db),
):
    get_user_connection(connection_id, user, db)

    unread_messages = db.scalars(
        select(Message).where(
            Message.connection_id == connection_id,
            Message.sender_id != user.id,
            Message.read_at.is_(None),
        )
    ).all()

    read_time = datetime.now(timezone.utc)

    for message in unread_messages:
        message.read_at = read_time

    db.commit()

    return MarkReadResponse(
        connection_id=connection_id,
        marked_read=len(unread_messages),
    )