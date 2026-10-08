import logging
from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.post_it import PostIt
from backend.app.models.profile import Profile
from backend.app.models.user import User
from backend.app.models.verification import (
    VerificationRequest,
)
from backend.app.routes.auth import require_admin
from backend.app.schemas.admin_tools import (
    AdminAccountDeleteRequest,
    AdminAccountDeleteResponse,
    AdminAccountStatusRequest,
    AdminAccountStatusResponse,
    AdminPostItRemovalRequest,
    AdminPostItRemovalResponse,
    AdminPostItResponse,
    AdminUserSummaryResponse,
)


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
)


PROFILE_PICTURE_DIR = (
    Path(__file__)
    .resolve()
    .parent
    .parent
    .parent
    / "uploads"
    / "profile_pictures"
)


@router.get(
    "/post-its",
    response_model=list[AdminPostItResponse],
)
def get_admin_post_its(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        select(
            PostIt,
            User,
            VerificationRequest.major,
        )
        .join(
            User,
            User.id == PostIt.user_id,
        )
        .outerjoin(
            VerificationRequest,
            VerificationRequest.user_id
            == PostIt.user_id,
        )
        .order_by(
            PostIt.created_at.desc()
        )
    ).all()

    return [
        AdminPostItResponse(
            id=post_it.id,
            user_id=user.id,
            username=user.username,
            display_name=post_it.display_name,
            major=major or "Unknown",
            fun_facts=post_it.fun_facts,
            song_title=post_it.song_title,
            song_artist=post_it.song_artist,
            color=post_it.color,
            created_at=post_it.created_at,
        )
        for post_it, user, major in rows
    ]


@router.delete(
    "/post-its/{post_it_id}",
    response_model=AdminPostItRemovalResponse,
)
def remove_post_it_as_admin(
    post_it_id: int,
    data: AdminPostItRemovalRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    post_it = db.get(
        PostIt,
        post_it_id,
    )

    if post_it is None:
        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,
            detail="Post-it not found",
        )

    owner = db.get(
        User,
        post_it.user_id,
    )

    if owner is None:
        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,
            detail="Post-it owner not found",
        )

    reason = data.reason.strip()

    logger.warning(
        "Admin %s removed Post-it %s "
        "owned by user %s (%s). Reason: %s",
        admin.id,
        post_it.id,
        owner.id,
        owner.username,
        reason,
    )

    deleted_post_it_id = post_it.id
    owner_id = owner.id
    owner_username = owner.username

    db.delete(post_it)
    db.commit()

    return AdminPostItRemovalResponse(
        post_it_id=deleted_post_it_id,
        user_id=owner_id,
        username=owner_username,
        message="Post-it removed from the bulletin",
    )


@router.get(
    "/users",
    response_model=list[AdminUserSummaryResponse],
)
def get_admin_users(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    users = db.scalars(
        select(User)
        .order_by(
            User.created_at.desc()
        )
    ).all()

    results = []

    for user in users:
        post_it = db.scalar(
            select(PostIt).where(
                PostIt.user_id == user.id
            )
        )

        verification = db.scalar(
            select(
                VerificationRequest
            ).where(
                VerificationRequest.user_id
                == user.id
            )
        )

        results.append(
            AdminUserSummaryResponse(
                id=user.id,
                username=user.username,
                display_name=(
                    post_it.display_name
                    if post_it is not None
                    else None
                ),
                full_name=(
                    verification.full_name
                    if verification is not None
                    else None
                ),
                major=(
                    verification.major
                    if verification is not None
                    else None
                ),
                role=user.role,
                verification_status=(
                    user.verification_status
                ),
                account_status=(
                    user.account_status
                ),
                created_at=user.created_at,
            )
        )

    return results


@router.patch(
    "/users/{user_id}/status",
    response_model=AdminAccountStatusResponse,
)
def update_account_status(
    user_id: int,
    data: AdminAccountStatusRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    target = db.get(
        User,
        user_id,
    )

    if target is None:
        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if target.id == admin.id:
        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,
            detail=(
                "You cannot change your own "
                "admin account status"
            ),
        )

    if target.role == "admin":
        raise HTTPException(
            status_code=
                status.HTTP_403_FORBIDDEN,
            detail=(
                "Admin accounts cannot be "
                "changed from this tool"
            ),
        )

    reason = data.reason.strip()
    previous_status = target.account_status

    target.account_status = (
        data.account_status
    )

    logger.warning(
        "Admin %s changed user %s (%s) "
        "account status from %s to %s. "
        "Reason: %s",
        admin.id,
        target.id,
        target.username,
        previous_status,
        target.account_status,
        reason,
    )

    db.commit()
    db.refresh(target)

    return AdminAccountStatusResponse(
        user_id=target.id,
        username=target.username,
        account_status=(
            target.account_status
        ),
        message=(
            "Account status updated"
        ),
    )


@router.delete(
    "/users/{user_id}",
    response_model=AdminAccountDeleteResponse,
)
def permanently_delete_user(
    user_id: int,
    data: AdminAccountDeleteRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    target = db.get(
        User,
        user_id,
    )

    if target is None:
        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if target.id == admin.id:
        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,
            detail=(
                "You cannot permanently delete "
                "your own admin account"
            ),
        )

    if target.role == "admin":
        raise HTTPException(
            status_code=
                status.HTTP_403_FORBIDDEN,
            detail=(
                "Admin accounts cannot be "
                "permanently deleted from "
                "this tool"
            ),
        )

    confirmation = (
        data.confirm_username
        .strip()
    )

    if confirmation != target.username:
        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,
            detail=(
                "Username confirmation does "
                "not match the account"
            ),
        )

    reason = data.reason.strip()

    profile = db.scalar(
        select(Profile).where(
            Profile.user_id == target.id
        )
    )

    picture_filename = None

    if (
        profile is not None
        and profile.profile_picture
    ):
        picture_filename = (
            profile.profile_picture
        )

    deleted_user_id = target.id
    deleted_username = target.username

    logger.warning(
        "Admin %s permanently deleting "
        "user %s (%s). Reason: %s",
        admin.id,
        target.id,
        target.username,
        reason,
    )

    try:
        db.delete(target)
        db.commit()
    except IntegrityError:
        db.rollback()

        logger.exception(
            "Permanent deletion failed "
            "for user %s (%s) because a "
            "database relationship blocked "
            "the deletion.",
            target.id,
            target.username,
        )

        raise HTTPException(
            status_code=
                status.HTTP_409_CONFLICT,
            detail=(
                "This account could not be "
                "permanently deleted because "
                "related database records are "
                "still protecting it. No data "
                "was deleted."
            ),
        )

    if picture_filename:
        picture_path = (
            PROFILE_PICTURE_DIR
            / picture_filename
        )

        try:
            if picture_path.exists():
                picture_path.unlink()
        except OSError:
            logger.exception(
                "User %s was deleted, but "
                "profile picture %s could not "
                "be removed from disk.",
                deleted_user_id,
                picture_filename,
            )

    logger.warning(
        "Admin %s permanently deleted "
        "user %s (%s).",
        admin.id,
        deleted_user_id,
        deleted_username,
    )

    return AdminAccountDeleteResponse(
        user_id=deleted_user_id,
        username=deleted_username,
        message=(
            "Account permanently deleted"
        ),
    )