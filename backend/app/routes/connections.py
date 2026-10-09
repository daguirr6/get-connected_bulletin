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
from backend.app.models.interest import Interest
from backend.app.models.post_it import PostIt
from backend.app.models.profile import Profile
from backend.app.models.profile_interest import (
    ProfileInterest,
)
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


def parse_legacy_interests(
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


def get_profile_interests(
    db: Session,
    profile: Profile,
) -> dict[str, str]:
    structured = db.scalars(
        select(Interest)
        .join(
            ProfileInterest,
            ProfileInterest.interest_id
            == Interest.id,
        )
        .where(
            ProfileInterest.profile_id
            == profile.id,
            Interest.is_active.is_(True),
        )
        .order_by(
            Interest.sort_order,
            Interest.name,
        )
    ).all()

    if structured:
        return {
            interest.normalized_name:
                interest.name
            for interest in structured
        }

    return parse_legacy_interests(
        profile.interests
    )


def get_direct_connection_ids(
    db: Session,
    user_id: int,
) -> set[int]:
    connections = db.scalars(
        select(Connection).where(
            or_(
                Connection.user_one_id
                == user_id,

                Connection.user_two_id
                == user_id,
            )
        )
    ).all()

    direct_ids = set()

    for connection in connections:
        if (
            connection.user_one_id
            == user_id
        ):
            direct_ids.add(
                connection.user_two_id
            )
        else:
            direct_ids.add(
                connection.user_one_id
            )

    return direct_ids


def build_mutual_map(
    db: Session,
    user_id: int,
    direct_ids: set[int],
) -> dict[int, set[int]]:
    mutual_map = {}

    for direct_id in direct_ids:
        if users_are_blocked(
            db,
            user_id,
            direct_id,
        ):
            continue

        connections = db.scalars(
            select(Connection).where(
                or_(
                    Connection.user_one_id
                    == direct_id,

                    Connection.user_two_id
                    == direct_id,
                )
            )
        ).all()

        for connection in connections:
            if (
                connection.user_one_id
                == direct_id
            ):
                candidate_id = (
                    connection.user_two_id
                )
            else:
                candidate_id = (
                    connection.user_one_id
                )

            if candidate_id == user_id:
                continue

            if candidate_id in direct_ids:
                continue

            mutual_map.setdefault(
                candidate_id,
                set(),
            ).add(
                direct_id
            )

    return mutual_map


def get_mutual_names(
    db: Session,
    user_id: int,
    mutual_ids: set[int],
) -> list[str]:
    names = []

    for mutual_id in mutual_ids:
        if users_are_blocked(
            db,
            user_id,
            mutual_id,
        ):
            continue

        mutual_user = db.get(
            User,
            mutual_id,
        )

        if (
            mutual_user is None
            or mutual_user.verification_status
            != "verified"
            or mutual_user.account_status
            != "active"
        ):
            continue

        post_it = db.scalar(
            select(PostIt).where(
                PostIt.user_id
                == mutual_id
            )
        )

        if post_it is None:
            continue

        names.append(
            post_it.display_name
        )

    return sorted(
        set(names),
        key=str.casefold,
    )


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

    if my_profile is not None:
        my_interests = (
            get_profile_interests(
                db,
                my_profile,
            )
        )
    else:
        my_interests = {}

    direct_ids = (
        get_direct_connection_ids(
            db,
            user.id,
        )
    )

    mutual_map = build_mutual_map(
        db,
        user.id,
        direct_ids,
    )

    candidate_profiles = db.scalars(
        select(Profile).where(
            Profile.user_id != user.id,
            Profile.status == "approved",
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
            get_profile_interests(
                db,
                candidate_profile,
            )
        )

        shared_keys = [
            key
            for key in my_interests
            if key
            in candidate_interests
        ]

        shared_interests = [
            candidate_interests[
                key
            ]
            for key in shared_keys
        ]

        mutual_names = (
            get_mutual_names(
                db,
                user.id,
                mutual_map.get(
                    candidate_id,
                    set(),
                ),
            )
        )

        if (
            not shared_interests
            and not mutual_names
        ):
            continue

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

                mutual_count=
                    len(
                        mutual_names
                    ),

                mutual_connections=
                    mutual_names,

                moderation=
                    get_public_moderation(
                        db,
                        candidate_id,
                    ),
            )
        )

    suggestions.sort(
        key=lambda suggestion: (
            -suggestion
            .shared_interest_count,

            -suggestion
            .mutual_count,

            suggestion
            .display_name
            .casefold(),

            suggestion.user_id,
        )
    )

    return suggestions[:25]