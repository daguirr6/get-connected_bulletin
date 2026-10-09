import calendar
import logging

from datetime import (
    datetime,
    timedelta,
    timezone,
)
from pathlib import Path
from zoneinfo import ZoneInfo

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy import select
from sqlalchemy.exc import (
    IntegrityError,
)
from sqlalchemy.orm import Session

import backend.app.activity_tracking

from backend.app.database import (
    get_db,
)
from backend.app.models.post_it import (
    PostIt,
)
from backend.app.models.profile import (
    Profile,
)
from backend.app.models.site_activity import (
    DailySiteActivity,
)
from backend.app.models.user import (
    User,
)
from backend.app.models.verification import (
    VerificationRequest,
)
from backend.app.routes.auth import (
    require_admin,
)
from backend.app.schemas.admin_tools import (
    AdminAccountDeleteRequest,
    AdminAccountDeleteResponse,
    AdminAccountStatusRequest,
    AdminAccountStatusResponse,
    AdminPostItRemovalRequest,
    AdminPostItRemovalResponse,
    AdminPostItResponse,
    AdminUserSummaryResponse,
    AdminWeeklyAnalyticsResponse,
    DailyUsagePoint,
    TimeUsagePoint,
)


logger = logging.getLogger(
    __name__
)


router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
)


MASON_TIMEZONE = ZoneInfo(
    "America/New_York"
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


def make_aware(
    value: datetime,
) -> datetime:
    if value.tzinfo is None:
        return value.replace(
            tzinfo=timezone.utc
        )

    return value


def format_hour(
    hour: int,
) -> str:
    if hour == 0:
        return "12 AM"

    if hour < 12:
        return f"{hour} AM"

    if hour == 12:
        return "12 PM"

    return f"{hour - 12} PM"


@router.get(
    "/post-its",
    response_model=list[
        AdminPostItResponse
    ],
)
def get_admin_post_its(
    admin: User = Depends(
        require_admin
    ),
    db: Session = Depends(
        get_db
    ),
):
    rows = db.execute(
        select(
            PostIt,
            User,
            VerificationRequest.major,
        )
        .join(
            User,
            User.id
            == PostIt.user_id,
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
            display_name=(
                post_it.display_name
            ),
            major=major or "Unknown",
            fun_facts=(
                post_it.fun_facts
            ),
            song_title=(
                post_it.song_title
            ),
            song_artist=(
                post_it.song_artist
            ),
            color=post_it.color,
            created_at=(
                post_it.created_at
            ),
        )
        for post_it, user, major
        in rows
    ]


@router.delete(
    "/post-its/{post_it_id}",
    response_model=
        AdminPostItRemovalResponse,
)
def remove_post_it_as_admin(
    post_it_id: int,
    data: AdminPostItRemovalRequest,
    admin: User = Depends(
        require_admin
    ),
    db: Session = Depends(
        get_db
    ),
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
            detail=(
                "Post-it owner not found"
            ),
        )

    reason = data.reason.strip()

    logger.warning(
        "Admin %s removed Post-it %s "
        "owned by user %s (%s). "
        "Reason: %s",
        admin.id,
        post_it.id,
        owner.id,
        owner.username,
        reason,
    )

    deleted_post_it_id = (
        post_it.id
    )

    owner_id = owner.id

    owner_username = (
        owner.username
    )

    db.delete(post_it)
    db.commit()

    return (
        AdminPostItRemovalResponse(
            post_it_id=(
                deleted_post_it_id
            ),
            user_id=owner_id,
            username=owner_username,
            message=(
                "Post-it removed "
                "from the bulletin"
            ),
        )
    )


@router.get(
    "/users",
    response_model=list[
        AdminUserSummaryResponse
    ],
)
def get_admin_users(
    admin: User = Depends(
        require_admin
    ),
    db: Session = Depends(
        get_db
    ),
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
                PostIt.user_id
                == user.id
            )
        )

        verification = db.scalar(
            select(
                VerificationRequest
            ).where(
                VerificationRequest
                .user_id
                == user.id
            )
        )

        results.append(
            AdminUserSummaryResponse(
                id=user.id,
                username=(
                    user.username
                ),
                display_name=(
                    post_it.display_name
                    if post_it
                    is not None
                    else None
                ),
                full_name=(
                    verification.full_name
                    if verification
                    is not None
                    else None
                ),
                major=(
                    verification.major
                    if verification
                    is not None
                    else None
                ),
                role=user.role,
                verification_status=(
                    user
                    .verification_status
                ),
                account_status=(
                    user.account_status
                ),
                created_at=(
                    user.created_at
                ),
            )
        )

    return results


@router.get(
    "/analytics/weekly",
    response_model=
        AdminWeeklyAnalyticsResponse,
)
def get_weekly_analytics(
    admin: User = Depends(
        require_admin
    ),
    db: Session = Depends(
        get_db
    ),
):
    today = (
        datetime.now(
            MASON_TIMEZONE
        ).date()
    )

    this_week_start = (
        today
        - timedelta(
            days=today.weekday()
        )
    )

    this_week_end = (
        this_week_start
        + timedelta(days=6)
    )

    last_week_start = (
        this_week_start
        - timedelta(days=7)
    )

    last_week_end = (
        this_week_start
        - timedelta(days=1)
    )

    rows = db.scalars(
        select(
            DailySiteActivity
        )
        .where(
            DailySiteActivity
            .activity_date
            >= last_week_start,

            DailySiteActivity
            .activity_date
            <= this_week_end,
        )
        .order_by(
            DailySiteActivity
            .activity_date,
            DailySiteActivity
            .user_id,
        )
    ).all()

    users_by_date = {}

    for row in rows:
        users_by_date.setdefault(
            row.activity_date,
            set(),
        )

        users_by_date[
            row.activity_date
        ].add(
            row.user_id
        )

    days = []

    for offset in range(7):
        current_date = (
            this_week_start
            + timedelta(
                days=offset
            )
        )

        previous_date = (
            last_week_start
            + timedelta(
                days=offset
            )
        )

        days.append(
            DailyUsagePoint(
                day_name=(
                    calendar
                    .day_name[offset]
                ),
                date=current_date,
                this_week=len(
                    users_by_date.get(
                        current_date,
                        set(),
                    )
                ),
                last_week=len(
                    users_by_date.get(
                        previous_date,
                        set(),
                    )
                ),
            )
        )

    this_week_rows = [
        row
        for row in rows
        if (
            this_week_start
            <= row.activity_date
            <= today
        )
    ]

    last_week_rows = [
        row
        for row in rows
        if (
            last_week_start
            <= row.activity_date
            <= last_week_end
        )
    ]

    this_week_users = {
        row.user_id
        for row in this_week_rows
    }

    last_week_users = {
        row.user_id
        for row in last_week_rows
    }

    this_week_total = len(
        this_week_users
    )

    last_week_total = len(
        last_week_users
    )

    if last_week_total == 0:
        weekly_change_percent = (
            None
        )
    else:
        weekly_change_percent = (
            round(
                (
                    (
                        this_week_total
                        - last_week_total
                    )
                    / last_week_total
                )
                * 100,
                1,
            )
        )

    elapsed_days = [
        day
        for day in days
        if day.date <= today
    ]

    if this_week_rows:
        busiest_day = max(
            elapsed_days,
            key=lambda item:
                item.this_week,
        ).day_name

        quietest_day = min(
            elapsed_days,
            key=lambda item:
                item.this_week,
        ).day_name
    else:
        busiest_day = None
        quietest_day = None

    hour_counts = {}

    for row in this_week_rows:
        first_seen = make_aware(
            row.first_seen_at
        )

        local_seen = (
            first_seen.astimezone(
                MASON_TIMEZONE
            )
        )

        hour = local_seen.hour

        hour_counts[hour] = (
            hour_counts.get(
                hour,
                0,
            )
            + 1
        )

    total_time_entries = (
        len(this_week_rows)
    )

    times = []

    for hour in sorted(
        hour_counts
    ):
        count = (
            hour_counts[hour]
        )

        percentage = (
            round(
                (
                    count
                    / total_time_entries
                    * 100
                ),
                1,
            )
            if total_time_entries
            else 0
        )

        times.append(
            TimeUsagePoint(
                hour=hour,
                label=format_hour(
                    hour
                ),
                count=count,
                percentage=(
                    percentage
                ),
            )
        )

    return (
        AdminWeeklyAnalyticsResponse(
            this_week_start=(
                this_week_start
            ),
            this_week_end=(
                this_week_end
            ),
            last_week_start=(
                last_week_start
            ),
            last_week_end=(
                last_week_end
            ),
            this_week_unique_users=(
                this_week_total
            ),
            last_week_unique_users=(
                last_week_total
            ),
            weekly_change_percent=(
                weekly_change_percent
            ),
            busiest_day=(
                busiest_day
            ),
            quietest_day=(
                quietest_day
            ),
            days=days,
            times=times,
        )
    )


@router.patch(
    "/users/{user_id}/status",
    response_model=
        AdminAccountStatusResponse,
)
def update_account_status(
    user_id: int,
    data: AdminAccountStatusRequest,
    admin: User = Depends(
        require_admin
    ),
    db: Session = Depends(
        get_db
    ),
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
                "You cannot change "
                "your own admin "
                "account status"
            ),
        )

    if target.role == "admin":
        raise HTTPException(
            status_code=
                status.HTTP_403_FORBIDDEN,
            detail=(
                "Admin accounts cannot "
                "be changed from this tool"
            ),
        )

    reason = data.reason.strip()

    previous_status = (
        target.account_status
    )

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

    return (
        AdminAccountStatusResponse(
            user_id=target.id,
            username=(
                target.username
            ),
            account_status=(
                target.account_status
            ),
            message=(
                "Account status updated"
            ),
        )
    )


@router.delete(
    "/users/{user_id}",
    response_model=
        AdminAccountDeleteResponse,
)
def permanently_delete_user(
    user_id: int,
    data: AdminAccountDeleteRequest,
    admin: User = Depends(
        require_admin
    ),
    db: Session = Depends(
        get_db
    ),
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
                "You cannot permanently "
                "delete your own "
                "admin account"
            ),
        )

    if target.role == "admin":
        raise HTTPException(
            status_code=
                status.HTTP_403_FORBIDDEN,
            detail=(
                "Admin accounts cannot "
                "be permanently deleted "
                "from this tool"
            ),
        )

    confirmation = (
        data
        .confirm_username
        .strip()
    )

    if (
        confirmation
        != target.username
    ):
        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,
            detail=(
                "Username confirmation "
                "does not match "
                "the account"
            ),
        )

    reason = data.reason.strip()

    profile = db.scalar(
        select(Profile).where(
            Profile.user_id
            == target.id
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

    deleted_user_id = (
        target.id
    )

    deleted_username = (
        target.username
    )

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
            "for user %s (%s) because "
            "a database relationship "
            "blocked the deletion.",
            target.id,
            target.username,
        )

        raise HTTPException(
            status_code=
                status.HTTP_409_CONFLICT,
            detail=(
                "This account could not "
                "be permanently deleted "
                "because related database "
                "records are still "
                "protecting it. No data "
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
                "User %s was deleted, "
                "but profile picture %s "
                "could not be removed "
                "from disk.",
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

    return (
        AdminAccountDeleteResponse(
            user_id=deleted_user_id,
            username=(
                deleted_username
            ),
            message=(
                "Account permanently "
                "deleted"
            ),
        )
    )