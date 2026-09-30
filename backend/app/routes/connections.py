import random
import re

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from backend.app.blocking import users_are_blocked
from backend.app.database import get_db
from backend.app.moderation import (
    get_public_moderation,
)
from backend.app.models.connection import Connection
from backend.app.models.post_it import PostIt
from backend.app.models.profile import Profile
from backend.app.models.user import User
from backend.app.models.verification import (
    VerificationRequest,
)
from backend.app.routes.auth import (
    require_verified_user,
)
from backend.app.schemas.connection import (
    ConnectionResponse,
    ConnectionSuggestionResponse,
)


router = APIRouter(
    prefix="/connections",
    tags=["Connections"],
)


def parse_interests(
    value: str | None,
) -> dict[str, str]:
    if not value:
        return {}

    pieces = re.split(
        r"[,;\n]+",
        value,
    )

    interests = {}

    for piece in pieces:
        display_value = " ".join(
            piece.strip().split()
        )

        if not display_value:
            continue

        normalized_value = (
            display_value.casefold()
        )

        if (
            normalized_value
            not in interests
        ):
            interests[
                normalized_value
            ] = display_value

    return interests


@router.post(
    "/{target_user_id}",
    response_model=ConnectionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_connection(
    target_user_id: int,

    user: User = Depends(
        require_verified_user
    ),

    db: Session = Depends(get_db),
):
    my_post_it = db.scalar(
        select(PostIt).where(
            PostIt.user_id == user.id
        )
    )

    if my_post_it is None:
        raise HTTPException(
            status_code=
                status.HTTP_403_FORBIDDEN,

            detail=(
                "Create a Post-it before "
                "connecting with others"
            ),
        )

    if target_user_id == user.id:
        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,

            detail=(
                "You cannot connect "
                "with yourself"
            ),
        )

    target_user = db.get(
        User,
        target_user_id,
    )

    if (
        target_user is None
        or target_user.verification_status
        != "verified"
        or target_user.account_status
        != "active"
    ):
        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail="User not found",
        )

    if users_are_blocked(
        db,
        user.id,
        target_user_id,
    ):
        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail="User not found",
        )

    target_post_it = db.scalar(
        select(PostIt).where(
            PostIt.user_id
            == target_user_id
        )
    )

    if target_post_it is None:
        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=(
                "User does not have "
                "a Post-it"
            ),
        )

    user_one_id = min(
        user.id,
        target_user_id,
    )

    user_two_id = max(
        user.id,
        target_user_id,
    )

    existing_connection = db.scalar(
        select(Connection).where(
            Connection.user_one_id
            == user_one_id,

            Connection.user_two_id
            == user_two_id,
        )
    )

    if existing_connection:
        raise HTTPException(
            status_code=
                status.HTTP_409_CONFLICT,

            detail=(
                "You are already connected"
            ),
        )

    verification = db.scalar(
        select(
            VerificationRequest
        ).where(
            VerificationRequest.user_id
            == target_user_id
        )
    )

    if verification is None:
        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=(
                "Verification record "
                "not found"
            ),
        )

    connection = Connection(
        user_one_id=user_one_id,
        user_two_id=user_two_id,
    )

    db.add(connection)
    db.commit()
    db.refresh(connection)

    return ConnectionResponse(
        id=connection.id,

        user_id=
            target_user.id,

        display_name=
            target_post_it.display_name,

        major=
            verification.major,

        connected_at=
            connection.created_at,

        moderation=
            get_public_moderation(
                db,
                target_user.id,
            ),
    )


@router.get(
    "",
    response_model=list[
        ConnectionResponse
    ],
)
def get_connections(
    user: User = Depends(
        require_verified_user
    ),

    db: Session = Depends(get_db),
):
    connections = db.scalars(
        select(Connection)
        .where(
            or_(
                Connection.user_one_id
                == user.id,

                Connection.user_two_id
                == user.id,
            )
        )
        .order_by(
            Connection.created_at.desc()
        )
    ).all()

    results = []

    for connection in connections:
        if (
            connection.user_one_id
            == user.id
        ):
            other_user_id = (
                connection.user_two_id
            )
        else:
            other_user_id = (
                connection.user_one_id
            )

        other_user = db.get(
            User,
            other_user_id,
        )

        if (
            other_user is None
            or
            other_user.verification_status
            != "verified"
            or
            other_user.account_status
            != "active"
        ):
            continue

        if users_are_blocked(
            db,
            user.id,
            other_user_id,
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

        results.append(
            ConnectionResponse(
                id=connection.id,

                user_id=
                    other_user_id,

                display_name=
                    display_name,

                major=
                    verification.major,

                connected_at=
                    connection.created_at,

                moderation=
                    get_public_moderation(
                        db,
                        other_user_id,
                    ),
            )
        )

    return results


@router.get(
    "/suggestions",
    response_model=list[
        ConnectionSuggestionResponse
    ],
)
def get_connection_suggestions(
    user: User = Depends(
        require_verified_user
    ),

    db: Session = Depends(get_db),
):
    my_post_it = db.scalar(
        select(PostIt).where(
            PostIt.user_id == user.id
        )
    )

    if my_post_it is None:
        raise HTTPException(
            status_code=
                status.HTTP_403_FORBIDDEN,

            detail=(
                "Create a Post-it before "
                "viewing connection "
                "suggestions"
            ),
        )

    my_profile = db.scalar(
        select(Profile).where(
            Profile.user_id == user.id
        )
    )

    if (
        my_profile is None
        or not my_profile.interests
    ):
        return []

    my_interests = parse_interests(
        my_profile.interests
    )

    if not my_interests:
        return []

    my_connections = db.scalars(
        select(Connection).where(
            or_(
                Connection.user_one_id
                == user.id,

                Connection.user_two_id
                == user.id,
            )
        )
    ).all()

    direct_ids = set()

    for connection in my_connections:
        if (
            connection.user_one_id
            == user.id
        ):
            direct_ids.add(
                connection.user_two_id
            )
        else:
            direct_ids.add(
                connection.user_one_id
            )

    candidate_profiles = db.scalars(
        select(Profile).where(
            Profile.user_id != user.id,

            Profile.status == "approved",

            Profile.interests.is_not(
                None
            ),
        )
    ).all()

    suggestions = []

    for candidate_profile in (
        candidate_profiles
    ):
        candidate_id = (
            candidate_profile.user_id
        )

        if candidate_id in direct_ids:
            continue

        if users_are_blocked(
            db,
            user.id,
            candidate_id,
        ):
            continue

        candidate = db.get(
            User,
            candidate_id,
        )

        if candidate is None:
            continue

        if (
            candidate.verification_status
            != "verified"
            or
            candidate.account_status
            != "active"
        ):
            continue

        candidate_post_it = db.scalar(
            select(PostIt).where(
                PostIt.user_id
                == candidate_id
            )
        )

        if candidate_post_it is None:
            continue

        verification = db.scalar(
            select(
                VerificationRequest
            ).where(
                VerificationRequest.user_id
                == candidate_id
            )
        )

        if verification is None:
            continue

        candidate_interests = (
            parse_interests(
                candidate_profile.interests
            )
        )

        shared_keys = [
            interest
            for interest
            in my_interests
            if interest
            in candidate_interests
        ]

        if not shared_keys:
            continue

        shared_interests = [
            candidate_interests[
                interest
            ]
            for interest
            in shared_keys
        ]

        suggestions.append(
            ConnectionSuggestionResponse(
                user_id=
                    candidate_id,

                display_name=
                    candidate_post_it
                    .display_name,

                major=
                    verification.major,

                shared_interest_count=
                    len(
                        shared_interests
                    ),

                shared_interests=
                    shared_interests,

                moderation=
                    get_public_moderation(
                        db,
                        candidate_id,
                    ),
            )
        )

    random.shuffle(
        suggestions
    )

    suggestions.sort(
        key=lambda suggestion:
            -suggestion
            .shared_interest_count
    )

    return suggestions[:25]