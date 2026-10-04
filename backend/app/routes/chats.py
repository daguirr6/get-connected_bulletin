import asyncio
from datetime import (
    datetime,
    timedelta,
    timezone,
)

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from sqlalchemy import (
    and_,
    func,
    or_,
    select,
)
from sqlalchemy.orm import Session

from backend.app.blocking import (
    has_blocked,
)
from backend.app.database import (
    SessionLocal,
    get_db,
)
from backend.app.models.connection import (
    Connection,
)
from backend.app.models.message import (
    Message,
)
from backend.app.models.post_it import (
    PostIt,
)
from backend.app.models.profile import (
    Profile,
)
from backend.app.models.user import (
    User,
)
from backend.app.models.verification import (
    VerificationRequest,
)
from backend.app.rate_limit import (
    check_websocket_message_limit,
    limit_chat_messages,
)
from backend.app.routes.auth import (
    require_verified_user,
)
from backend.app.schemas.chat import (
    ChatSummaryResponse,
    MarkReadResponse,
    MessageCreate,
    MessageResponse,
    PresenceResponse,
    PresenceUpdate,
)
from backend.app.security import (
    decode_access_token,
)
from backend.app.websocket_manager import (
    manager,
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
    connection = db.get(
        Connection,
        connection_id,
    )

    if connection is None:
        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,
            detail=(
                "Connection not found"
            ),
        )

    belongs_to_user = (
        connection.user_one_id
        == user.id
        or
        connection.user_two_id
        == user.id
    )

    if not belongs_to_user:
        raise HTTPException(
            status_code=
                status.HTTP_403_FORBIDDEN,
            detail=(
                "You do not have access "
                "to this chat"
            ),
        )

    return connection


def get_other_user_id(
    connection: Connection,
    user_id: int,
) -> int:
    if (
        connection.user_one_id
        == user_id
    ):
        return (
            connection.user_two_id
        )

    return (
        connection.user_one_id
    )


PRESENCE_TIMEOUT = timedelta(
    seconds=70
)


def presence_is_fresh(
    last_seen_at: datetime | None,
) -> bool:
    if last_seen_at is None:
        return False

    if last_seen_at.tzinfo is None:
        last_seen_at = (
            last_seen_at.replace(
                tzinfo=timezone.utc
            )
        )

    return (
        datetime.now(timezone.utc)
        - last_seen_at
        <= PRESENCE_TIMEOUT
    )


def get_visible_presence(
    viewer: User,
    target: User,
) -> str:
    # Invisible mode is reciprocal.
    # If you hide your own status,
    # everybody else appears offline too.
    if (
        viewer.presence_mode
        == "invisible"
    ):
        return "offline"

    if (
        target.presence_mode
        == "invisible"
    ):
        return "offline"

    if not presence_is_fresh(
        target.last_seen_at
    ):
        return "offline"

    if target.presence_mode == "busy":
        return "busy"

    return "online"


def get_profile_picture_url(
    db: Session,
    user_id: int,
) -> str | None:
    profile = db.scalar(
        select(Profile).where(
            Profile.user_id == user_id
        )
    )

    if (
        profile is None
        or profile.status != "approved"
        or not profile.profile_picture
    ):
        return None

    return (
        "/uploads/profile_pictures/"
        f"{profile.profile_picture}"
    )


def users_are_connected(
    db: Session,
    first_user_id: int,
    second_user_id: int,
) -> bool:
    connection = db.scalar(
        select(Connection).where(
            or_(
                and_(
                    Connection.user_one_id
                    == first_user_id,
                    Connection.user_two_id
                    == second_user_id,
                ),
                and_(
                    Connection.user_one_id
                    == second_user_id,
                    Connection.user_two_id
                    == first_user_id,
                ),
            )
        )
    )

    return connection is not None


@router.post(
    "/presence/heartbeat",
    response_model=PresenceResponse,
)
def heartbeat_presence(
    user: User = Depends(
        require_verified_user
    ),
    db: Session = Depends(
        get_db
    ),
):
    user.last_seen_at = (
        datetime.now(timezone.utc)
    )

    db.commit()
    db.refresh(user)

    return PresenceResponse(
        user_id=user.id,
        mode=user.presence_mode,
        status=(
            "offline"
            if user.presence_mode
            == "invisible"
            else user.presence_mode
        ),
        last_seen_at=user.last_seen_at,
    )


@router.get(
    "/presence/me",
    response_model=PresenceResponse,
)
def get_my_presence(
    user: User = Depends(
        require_verified_user
    ),
):
    return PresenceResponse(
        user_id=user.id,
        mode=user.presence_mode,
        status=(
            "offline"
            if user.presence_mode
            == "invisible"
            else (
                user.presence_mode
                if presence_is_fresh(
                    user.last_seen_at
                )
                else "offline"
            )
        ),
        last_seen_at=user.last_seen_at,
    )


@router.patch(
    "/presence/me",
    response_model=PresenceResponse,
)
def update_my_presence(
    data: PresenceUpdate,
    user: User = Depends(
        require_verified_user
    ),
    db: Session = Depends(
        get_db
    ),
):
    user.presence_mode = data.mode
    user.last_seen_at = (
        datetime.now(timezone.utc)
    )

    db.commit()
    db.refresh(user)

    return PresenceResponse(
        user_id=user.id,
        mode=user.presence_mode,
        status=(
            "offline"
            if user.presence_mode
            == "invisible"
            else user.presence_mode
        ),
        last_seen_at=user.last_seen_at,
    )


@router.get(
    "/presence/{target_user_id}",
    response_model=PresenceResponse,
)
def get_user_presence(
    target_user_id: int,
    user: User = Depends(
        require_verified_user
    ),
    db: Session = Depends(
        get_db
    ),
):
    if not users_are_connected(
        db,
        user.id,
        target_user_id,
    ):
        raise HTTPException(
            status_code=
                status.HTTP_403_FORBIDDEN,
            detail=(
                "Presence is only available "
                "for your connections"
            ),
        )

    target = db.get(
        User,
        target_user_id,
    )

    if target is None:
        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return PresenceResponse(
        user_id=target.id,
        mode=None,
        status=get_visible_presence(
            user,
            target,
        ),
        last_seen_at=None,
    )


@router.get(
    "",
    response_model=list[
        ChatSummaryResponse
    ],
)
def get_chats(
    user: User = Depends(
        require_verified_user
    ),

    db: Session = Depends(
        get_db
    ),
):
    connections = db.scalars(
        select(Connection).where(
            or_(
                Connection.user_one_id
                == user.id,

                Connection.user_two_id
                == user.id,
            )
        )
    ).all()

    chats = []

    for connection in connections:
        other_user_id = (
            get_other_user_id(
                connection,
                user.id,
            )
        )

        other_user = db.get(
            User,
            other_user_id,
        )

        if other_user is None:
            continue

        if (
            other_user
            .verification_status
            != "verified"
        ):
            continue

        if (
            other_user
            .account_status
            != "active"
        ):
            continue

        post_it = db.scalar(
            select(PostIt).where(
                PostIt.user_id
                == other_user_id
            )
        )

        verification = db.scalar(
            select(
                VerificationRequest
            ).where(
                VerificationRequest.user_id
                == other_user_id
            )
        )

        if verification is None:
            continue

        if post_it is not None:
            display_name = (
                post_it.display_name
            )
        else:
            display_name = (
                other_user.username
            )

        last_message = db.scalar(
            select(Message)
            .where(
                Message.connection_id
                == connection.id,

                or_(
                    Message
                    .recipient_visible
                    .is_(True),

                    Message.sender_id
                    == user.id,
                ),
            )
            .order_by(
                Message.created_at.desc()
            )
            .limit(1)
        )

        unread_count = db.scalar(
            select(
                func.count(
                    Message.id
                )
            ).where(
                Message.connection_id
                == connection.id,

                Message.sender_id
                != user.id,

                Message
                .recipient_visible
                .is_(True),

                Message.read_at
                .is_(None),
            )
        )

        chats.append(
            ChatSummaryResponse(
                connection_id=
                    connection.id,

                user_id=
                    other_user_id,

                display_name=
                    display_name,

                major=
                    verification.major,

                profile_picture_url=(
                    get_profile_picture_url(
                        db,
                        other_user_id,
                    )
                ),

                presence_status=(
                    get_visible_presence(
                        user,
                        other_user,
                    )
                ),

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

                unread_count=(
                    unread_count or 0
                ),
            )
        )

    chats.sort(
        key=lambda chat: (
            chat.last_message_at
            is not None,

            chat.last_message_at,
        ),
        reverse=True,
    )

    return chats


@router.post(
    "/{connection_id}/messages",
    response_model=MessageResponse,
    status_code=
        status.HTTP_201_CREATED,
    dependencies=[
        Depends(limit_chat_messages),
    ],
)
def send_message(
    connection_id: int,

    data: MessageCreate,

    user: User = Depends(
        require_verified_user
    ),

    db: Session = Depends(
        get_db
    ),
):
    connection = get_user_connection(
        connection_id,
        user,
        db,
    )

    recipient_id = get_other_user_id(
        connection,
        user.id,
    )

    if has_blocked(
        db,
        user.id,
        recipient_id,
    ):
        raise HTTPException(
            status_code=
                status.HTTP_403_FORBIDDEN,
            detail=(
                "Unblock this user "
                "before messaging them"
            ),
        )

    recipient_blocked_sender = (
        has_blocked(
            db,
            recipient_id,
            user.id,
        )
    )

    content = (
        data.content.strip()
    )

    if not content:
        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,
            detail=(
                "Message cannot be empty"
            ),
        )

    if len(content) > 2000:
        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,
            detail=(
                "Message is too long"
            ),
        )

    message = Message(
        connection_id=
            connection_id,

        sender_id=
            user.id,

        content=
            content,

        recipient_visible=(
            not
            recipient_blocked_sender
        ),
    )

    db.add(message)
    db.commit()
    db.refresh(message)

    return MessageResponse(
        id=message.id,

        connection_id=
            message.connection_id,

        sender_id=
            message.sender_id,

        content=
            message.content,

        created_at=
            message.created_at,

        read_at=
            message.read_at,
    )


@router.get(
    "/{connection_id}/messages",
    response_model=list[
        MessageResponse
    ],
)
def get_messages(
    connection_id: int,

    user: User = Depends(
        require_verified_user
    ),

    db: Session = Depends(
        get_db
    ),
):
    get_user_connection(
        connection_id,
        user,
        db,
    )

    messages = db.scalars(
        select(Message)
        .where(
            Message.connection_id
            == connection_id,

            or_(
                Message
                .recipient_visible
                .is_(True),

                Message.sender_id
                == user.id,
            ),
        )
        .order_by(
            Message.created_at
        )
    ).all()

    return [
        MessageResponse(
            id=message.id,

            connection_id=
                message.connection_id,

            sender_id=
                message.sender_id,

            content=
                message.content,

            created_at=
                message.created_at,

            read_at=
                message.read_at,
        )
        for message in messages
    ]


@router.patch(
    "/{connection_id}/read",
    response_model=MarkReadResponse,
)
def mark_chat_read(
    connection_id: int,

    user: User = Depends(
        require_verified_user
    ),

    db: Session = Depends(
        get_db
    ),
):
    get_user_connection(
        connection_id,
        user,
        db,
    )

    unread_messages = db.scalars(
        select(Message).where(
            Message.connection_id
            == connection_id,

            Message.sender_id
            != user.id,

            Message
            .recipient_visible
            .is_(True),

            Message.read_at
            .is_(None),
        )
    ).all()

    read_time = datetime.now(
        timezone.utc
    )

    for message in unread_messages:
        message.read_at = read_time

    db.commit()

    return MarkReadResponse(
        connection_id=
            connection_id,

        marked_read=
            len(unread_messages),
    )


@router.websocket(
    "/{connection_id}/ws"
)
async def chat_websocket(
    websocket: WebSocket,
    connection_id: int,
):
    await websocket.accept()

    user_id = None

    try:
        try:
            auth_data = (
                await asyncio.wait_for(
                    websocket.receive_json(),
                    timeout=10,
                )
            )

        except asyncio.TimeoutError:
            await websocket.close(
                code=1008,
                reason=(
                    "Authentication timed out"
                ),
            )

            return

        if not isinstance(
            auth_data,
            dict,
        ):
            await websocket.close(
                code=1008,
                reason=(
                    "Invalid authentication"
                ),
            )

            return

        if (
            auth_data.get("type")
            != "auth"
        ):
            await websocket.close(
                code=1008,
                reason=(
                    "Authentication required"
                ),
            )

            return

        token = auth_data.get(
            "token"
        )

        if not isinstance(
            token,
            str,
        ):
            await websocket.close(
                code=1008,
                reason=(
                    "Invalid authentication"
                ),
            )

            return

        decoded_user_id = (
            decode_access_token(
                token
            )
        )

        if decoded_user_id is None:
            await websocket.close(
                code=1008,
                reason=(
                    "Invalid or expired login"
                ),
            )

            return

        unread_message_ids = []
        read_time = None

        with SessionLocal() as db:
            user = db.get(
                User,
                decoded_user_id,
            )

            connection = db.get(
                Connection,
                connection_id,
            )

            if user is None:
                await websocket.close(
                    code=1008,
                    reason=(
                        "User not found"
                    ),
                )

                return

            if (
                user.account_status
                != "active"
            ):
                await websocket.close(
                    code=1008,
                    reason=(
                        "Account is not active"
                    ),
                )

                return

            if (
                user.verification_status
                != "verified"
            ):
                await websocket.close(
                    code=1008,
                    reason=(
                        "Account is not verified"
                    ),
                )

                return

            if connection is None:
                await websocket.close(
                    code=1008,
                    reason=(
                        "Connection not found"
                    ),
                )

                return

            belongs_to_user = (
                connection.user_one_id
                == user.id
                or
                connection.user_two_id
                == user.id
            )

            if not belongs_to_user:
                await websocket.close(
                    code=1008,
                    reason=(
                        "You do not have "
                        "access to this chat"
                    ),
                )

                return

            user_id = user.id

            unread_messages = db.scalars(
                select(Message).where(
                    Message.connection_id
                    == connection_id,

                    Message.sender_id
                    != user.id,

                    Message
                    .recipient_visible
                    .is_(True),

                    Message.read_at
                    .is_(None),
                )
            ).all()

            if unread_messages:
                read_time = datetime.now(
                    timezone.utc
                )

                for message in unread_messages:
                    message.read_at = (
                        read_time
                    )

                    unread_message_ids.append(
                        message.id
                    )

                db.commit()

        manager.connect(
            connection_id,
            user_id,
            websocket,
        )

        await websocket.send_json(
            {
                "type": "ready",
                "connection_id":
                    connection_id,
                "user_id":
                    user_id,
            }
        )

        if unread_message_ids:
            await manager.broadcast(
                connection_id,
                {
                    "type": "read",

                    "connection_id":
                        connection_id,

                    "reader_id":
                        user_id,

                    "message_ids":
                        unread_message_ids,

                    "read_at": (
                        read_time
                        .isoformat()
                    ),
                },
            )

        while True:
            data = (
                await websocket
                .receive_json()
            )

            if not isinstance(
                data,
                dict,
            ):
                await websocket.send_json(
                    {
                        "type": "error",
                        "message": (
                            "Invalid message"
                        ),
                    }
                )

                continue

            message_type = data.get(
                "type"
            )

            if message_type == "typing":
                is_typing = bool(
                    data.get(
                        "is_typing",
                        False,
                    )
                )

                recipient_id = None
                can_send_typing = False

                with SessionLocal() as db:
                    user = db.get(
                        User,
                        user_id,
                    )

                    connection = db.get(
                        Connection,
                        connection_id,
                    )

                    if (
                        user is not None
                        and connection is not None
                        and user.account_status
                        == "active"
                        and user.verification_status
                        == "verified"
                    ):
                        belongs_to_user = (
                            connection.user_one_id
                            == user.id
                            or
                            connection.user_two_id
                            == user.id
                        )

                        if belongs_to_user:
                            recipient_id = (
                                get_other_user_id(
                                    connection,
                                    user.id,
                                )
                            )

                            can_send_typing = (
                                not has_blocked(
                                    db,
                                    user.id,
                                    recipient_id,
                                )
                                and
                                not has_blocked(
                                    db,
                                    recipient_id,
                                    user.id,
                                )
                            )

                if (
                    can_send_typing
                    and recipient_id
                    is not None
                ):
                    await manager.send_to_user(
                        connection_id,
                        recipient_id,
                        {
                            "type": "typing",
                            "user_id": user_id,
                            "is_typing": is_typing,
                        },
                    )

                continue

            if message_type != "message":
                await websocket.send_json(
                    {
                        "type": "error",
                        "message": (
                            "Unknown message type"
                        ),
                    }
                )

                continue

            content = data.get(
                "content"
            )

            if not isinstance(
                content,
                str,
            ):
                await websocket.send_json(
                    {
                        "type": "error",
                        "message": (
                            "Message content "
                            "is required"
                        ),
                    }
                )

                continue

            content = content.strip()

            if not content:
                await websocket.send_json(
                    {
                        "type": "error",
                        "message": (
                            "Message cannot "
                            "be empty"
                        ),
                    }
                )

                continue

            if len(content) > 2000:
                await websocket.send_json(
                    {
                        "type": "error",
                        "message": (
                            "Message is too long"
                        ),
                    }
                )

                continue

            retry_after = (
                check_websocket_message_limit(
                    user_id
                )
            )

            if (
                retry_after
                is not None
            ):
                await websocket.send_json(
                    {
                        "type": "error",

                        "code":
                            "rate_limited",

                        "message": (
                            "You're sending "
                            "messages too quickly. "
                            "Please wait a moment."
                        ),

                        "retry_after":
                            retry_after,
                    }
                )

                continue

            should_only_echo_to_sender = (
                False
            )

            with SessionLocal() as db:
                user = db.get(
                    User,
                    user_id,
                )

                connection = db.get(
                    Connection,
                    connection_id,
                )

                if (
                    user is None
                    or
                    connection is None
                ):
                    await websocket.close(
                        code=1008,
                        reason=(
                            "Chat access ended"
                        ),
                    )

                    return

                belongs_to_user = (
                    connection.user_one_id
                    == user.id
                    or
                    connection.user_two_id
                    == user.id
                )

                if (
                    user.account_status
                    != "active"
                    or
                    user.verification_status
                    != "verified"
                    or
                    not belongs_to_user
                ):
                    await websocket.close(
                        code=1008,
                        reason=(
                            "Chat access ended"
                        ),
                    )

                    return

                recipient_id = (
                    get_other_user_id(
                        connection,
                        user.id,
                    )
                )

                if has_blocked(
                    db,
                    user.id,
                    recipient_id,
                ):
                    await websocket.send_json(
                        {
                            "type": "error",
                            "message": (
                                "Unblock this user "
                                "before messaging them"
                            ),
                        }
                    )

                    continue

                recipient_blocked_sender = (
                    has_blocked(
                        db,
                        recipient_id,
                        user.id,
                    )
                )

                message = Message(
                    connection_id=
                        connection_id,

                    sender_id=
                        user_id,

                    content=
                        content,

                    recipient_visible=(
                        not
                        recipient_blocked_sender
                    ),
                )

                db.add(message)
                db.flush()

                if (
                    not
                    recipient_blocked_sender
                    and
                    manager
                    .is_user_connected(
                        connection_id,
                        recipient_id,
                    )
                ):
                    message.read_at = (
                        datetime.now(
                            timezone.utc
                        )
                    )

                db.commit()
                db.refresh(message)

                message_data = {
                    "type":
                        "message",

                    "id":
                        message.id,

                    "connection_id":
                        message.connection_id,

                    "sender_id":
                        message.sender_id,

                    "content":
                        message.content,

                    "created_at": (
                        message
                        .created_at
                        .isoformat()
                    ),

                    "read_at": (
                        message
                        .read_at
                        .isoformat()
                        if message.read_at
                        else None
                    ),
                }

                should_only_echo_to_sender = (
                    recipient_blocked_sender
                )

            if should_only_echo_to_sender:
                await manager.send_to_user(
                    connection_id,
                    user_id,
                    message_data,
                )

            else:
                await manager.broadcast(
                    connection_id,
                    message_data,
                )

    except WebSocketDisconnect:
        pass

    finally:
        if user_id is not None:
            manager.disconnect(
                connection_id,
                user_id,
                websocket,
            )