from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.connection import Connection
from backend.app.models.message import Message
from backend.app.models.user import User
from backend.app.routes.auth import require_verified_user
from backend.app.schemas.chat import MessageCreate, MessageResponse


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
        )
        for message in messages
    ]